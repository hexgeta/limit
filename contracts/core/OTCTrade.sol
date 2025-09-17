// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./utils/whitelist.sol";
import "./utils/IUniswapAnchorView.sol";
import "./utils/IBistroStaking.sol";


contract OTC is Whitelist, ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum OrderStatus {
        Active,
        Cancelled,
        Completed
    }

    struct OrderDetails {
        address sellToken;
        uint256 sellAmount;
        uint256[] buyTokensIndex;
        uint256[] buyAmounts;
        uint256 expirationTime;
    }

    struct UserOrderDetails {
        uint256 orderIndex;
        address orderOwner;
    }

    struct OrderDetailsWithId {
        uint256 orderId;
        uint256 remainingExecutionPercentage;
        uint256 redemeedPercentage;
        uint32 lastUpdateTime;
        OrderStatus status;
        OrderDetails orderDetails;
    }

    struct CompleteOrderDetails {
        UserOrderDetails userDetails;
        OrderDetailsWithId orderDetailsWithId;
    }

    mapping(address => OrderDetailsWithId[]) private orders;

    mapping(uint256 => UserOrderDetails) private userDetailsByOrderId;

    mapping(uint256 => mapping(uint256 => uint256)) private buyTransactionsByOrderId;

    uint256 private orderCounter = 0;

    address private adminWallet;

    address private uniswapAnchorView;

    address private bistroStaking;

    address private beanToken;

    uint32 private cooldownPeriod;

    uint256 private redeemFees;

    uint256 private discountInRedeemFees;

    uint256 private listingFeesInUSD;

    uint256 public constant PECENTAGE_DIVISOR = 10000;

    uint256 public constant DIVISOR = 10 ** 18;

    uint256 public immutable REDEEM_FEES_LIMIT;
    uint256 public immutable LISTING_FEES_LIMIT;

    address public constant NATIVE_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    event OrderPlaced(address indexed user, uint256 orderId);
    event OrderCancelled(address indexed user, uint256 orderId);
    event OrderUpdated(uint256 orderId);
    event OrderExecuted(address indexed user, uint256 orderId);
    event OrderRedeemded(address indexed user, uint256 orderId);

    modifier validOrderId(uint256 _orderId) {
        require(_orderId <= orderCounter, "otc:Invalid order ID");
        _;
    }

    constructor(
        address _adminWallet,
        address _beanToken,
        address _uniswapAnchor,
        address _bistroStaking,
        uint256 _listingFeesInUSD,
        uint256 _redeemFees,
        uint256 _discountInRedeemFees,
        uint256 _listingFeesLimit,
        uint256 _redeemFeesLimit,
        uint32 _cooldownPeriod
    ) Ownable(msg.sender) ERC20("OTC", "OTC") {
        LISTING_FEES_LIMIT = _listingFeesLimit;
        REDEEM_FEES_LIMIT = _redeemFeesLimit;
        _updateAdminWallet(_adminWallet);
        _updateBeanToken(_beanToken);
        _updateUniswapAnchor(_uniswapAnchor);
        _updateBistroStaking(_bistroStaking);
        _updateRedeemFees(_redeemFees);
        _updateListingFees(_listingFeesInUSD);
        _updateDiscountInRedeemFees(_discountInRedeemFees);
        _updateCoolDownPeriod(_cooldownPeriod);
    }

    function updateAdminWallet(address _newAdminWallet) external onlyOwner {
        _updateAdminWallet(_newAdminWallet);
    }

    function updateCoolDownPeriod(uint32 _newCoolDownPeriod) external onlyOwner {
        _updateCoolDownPeriod(_newCoolDownPeriod);
    }

    function updateListingFees(uint256 _amountInUSD) external onlyOwner {
        _updateListingFees(_amountInUSD);
    }

    function updateRedeemFees(uint256 _newRedeemFees) external onlyOwner {
        _updateRedeemFees(_newRedeemFees);
    }

    function updateDiscountInRedeemFees(uint256 _newDiscountInRedeemFees) external onlyOwner {
        _updateDiscountInRedeemFees(_newDiscountInRedeemFees);
    }

    function updateBistroStaking(address _newBistroStaking) external onlyOwner {
        _updateBistroStaking(_newBistroStaking);
    }

    function updateBeanToken(address _newBeanToken) external onlyOwner {
        _updateBeanToken(_newBeanToken);
    }

    function updateUniswapAnchor(address _newUniswapAnchor) external onlyOwner {
        _updateUniswapAnchor(_newUniswapAnchor);
    }

    function placeOrder(OrderDetails calldata _orderDetails) external payable nonReentrant {
        _checkTokenAndAmount(_orderDetails.buyTokensIndex, _orderDetails.buyAmounts);

        if (_orderDetails.sellToken == NATIVE_ADDRESS) {
            require(msg.value >= _orderDetails.sellAmount, "otc:not enough tokens provided");
        } else {
            require(msg.value == 0, "otc:native token not required");
        }

        require(_orderDetails.sellAmount > 0, "otc:sell amount should be greater than 0");

        require(_orderDetails.expirationTime > block.timestamp, "otc:expiration time should be in future");
        orderCounter++;

        OrderDetailsWithId memory orderDetailsWithId = OrderDetailsWithId({
            orderId: orderCounter,
            remainingExecutionPercentage: DIVISOR,
            redemeedPercentage: 0,
            lastUpdateTime: uint32(block.timestamp),
            status: OrderStatus.Active,
            orderDetails: _orderDetails
        });
        orders[msg.sender].push(orderDetailsWithId);

        UserOrderDetails memory userOrderDetails = UserOrderDetails({
            orderIndex: orders[msg.sender].length - 1,
            orderOwner: msg.sender
        });
        userDetailsByOrderId[orderCounter] = userOrderDetails;
        _mint(msg.sender, _orderDetails.sellAmount);

        uint256 currentBeanPrice = IUniswapAnchorView(uniswapAnchorView).fetchPrice();
        uint8 beanDecimals = IERC20Metadata(beanToken).decimals();
        uint256 requiredBeanAmount = 0;
        if (currentBeanPrice != 0) {
            requiredBeanAmount = (listingFeesInUSD * 10 ** beanDecimals) / currentBeanPrice;
        }

        if (requiredBeanAmount > 0) {
            IERC20(beanToken).safeTransferFrom(msg.sender, adminWallet, requiredBeanAmount);
        }

        if (_orderDetails.sellToken == NATIVE_ADDRESS) {
            uint256 extraTokens = msg.value - _orderDetails.sellAmount;
            if (extraTokens > 0) {
                _sendNativeToken(extraTokens);
            }
        } else {
            uint256 sellTokenAmountBefore = IERC20(_orderDetails.sellToken).balanceOf(address(this));
            IERC20(_orderDetails.sellToken).safeTransferFrom(msg.sender, address(this), _orderDetails.sellAmount);
            uint256 sellTokenAmountAfter = IERC20(_orderDetails.sellToken).balanceOf(address(this));
            require(
                sellTokenAmountAfter - sellTokenAmountBefore == _orderDetails.sellAmount,
                "otc:sell amount is not transferred correctly"
            );
        }

        emit OrderPlaced(msg.sender, orderCounter);
    }

    function cancelOrder(uint256 _orderId) external nonReentrant validOrderId(_orderId) {
        UserOrderDetails memory userOrderDetails = userDetailsByOrderId[_orderId];
        require(userOrderDetails.orderOwner == msg.sender, "otc:Unauthorized");

        _redeemOrder(_orderId);

        OrderDetailsWithId storage orderDetailsWithId = orders[msg.sender][userOrderDetails.orderIndex];

        require(orderDetailsWithId.status != OrderStatus.Cancelled, "otc:order already cancelled");

        OrderDetails memory orderDetails = orderDetailsWithId.orderDetails;

        uint256 remainingExecutionPercentage = orderDetailsWithId.remainingExecutionPercentage;

        orderDetailsWithId.status = OrderStatus.Cancelled;
        require(remainingExecutionPercentage > 0, "otc:order is already completed");
        _burn(msg.sender, (orderDetails.sellAmount * remainingExecutionPercentage) / DIVISOR);

        if (orderDetails.sellToken == NATIVE_ADDRESS) {
            _sendNativeToken((orderDetails.sellAmount * remainingExecutionPercentage) / DIVISOR);
        } else {
            IERC20(orderDetails.sellToken).safeTransfer(
                msg.sender,
                (orderDetails.sellAmount * remainingExecutionPercentage) / DIVISOR
            );
        }
        // Emit the OrderCancelled event
        emit OrderCancelled(msg.sender, _orderId);
    }

    function updateOrderInfo(
        uint256 _orderId,
        uint256 _newSellAmount,
        uint256[] calldata _newBuyTokensIndex,
        uint256[] calldata _newBuyAmount
    ) external payable nonReentrant validOrderId(_orderId) {
        UserOrderDetails memory userOrderDetails = _orderPreCheck(_orderId);

        OrderDetailsWithId storage orderDetailsWithId = orders[msg.sender][userOrderDetails.orderIndex];

        require(
            orderDetailsWithId.remainingExecutionPercentage == DIVISOR,
            "otc:sell amount and buy tokens can not be updated"
        );

        if (_newBuyTokensIndex.length > 0) {
            _checkTokenAndAmount(_newBuyTokensIndex, _newBuyAmount);
            orderDetailsWithId.orderDetails.buyTokensIndex = _newBuyTokensIndex;
            orderDetailsWithId.orderDetails.buyAmounts = _newBuyAmount;
            orderDetailsWithId.lastUpdateTime = uint32(block.timestamp);
        }

        if (orderDetailsWithId.orderDetails.sellAmount != _newSellAmount) {
            uint256 previousSellAmount = orderDetailsWithId.orderDetails.sellAmount;
            orderDetailsWithId.orderDetails.sellAmount = _newSellAmount;
            orderDetailsWithId.lastUpdateTime = uint32(block.timestamp);
            require(orderDetailsWithId.orderDetails.sellAmount > 0, "otc:sell amount can not be zero");
            if (_newSellAmount > previousSellAmount) {
                uint256 additionalAmount = _newSellAmount - previousSellAmount;
                _mint(msg.sender, additionalAmount);
                if (orderDetailsWithId.orderDetails.sellToken == NATIVE_ADDRESS) {
                    require(msg.value >= additionalAmount, "otc:provide correct amount");

                    uint256 extraTokens = msg.value - additionalAmount;
                    if (extraTokens > 0) {
                        _sendNativeToken(extraTokens);
                    }
                } else {
                    uint256 sellTokenAmountBefore = IERC20(orderDetailsWithId.orderDetails.sellToken).balanceOf(
                        address(this)
                    );
                    IERC20(orderDetailsWithId.orderDetails.sellToken).safeTransferFrom(
                        msg.sender,
                        address(this),
                        additionalAmount
                    );
                    uint256 sellTokenAmountAfter = IERC20(orderDetailsWithId.orderDetails.sellToken).balanceOf(
                        address(this)
                    );
                    require(
                        sellTokenAmountAfter - sellTokenAmountBefore == additionalAmount,
                        "otc:sell amount is not transferred correctly"
                    );
                }
            } else {
                uint256 reverseAmount = previousSellAmount - _newSellAmount;
                _burn(msg.sender, reverseAmount);
                if (orderDetailsWithId.orderDetails.sellToken == NATIVE_ADDRESS) {
                    _sendNativeToken(reverseAmount);
                } else {
                    IERC20(orderDetailsWithId.orderDetails.sellToken).safeTransfer(msg.sender, reverseAmount);
                }
            }
        }

        emit OrderUpdated(_orderId);
    }

    function updateOrderPrice(
        uint256 _orderId,
        uint256[] calldata _indexes,
        uint256[] calldata _newBuyAmounts
    ) external nonReentrant validOrderId(_orderId) {
        UserOrderDetails memory userOrderDetails = _orderPreCheck(_orderId);
        OrderDetailsWithId storage orderDetailsWithId = orders[msg.sender][userOrderDetails.orderIndex];

        for (uint i = 0; i < _indexes.length; i++) {
            require(_newBuyAmounts[i] > 0, "otc:buy amount should not be zero");
            orderDetailsWithId.orderDetails.buyAmounts[_indexes[i]] = _newBuyAmounts[i];
        }
        orderDetailsWithId.lastUpdateTime = uint32(block.timestamp);

        emit OrderUpdated(_orderId);
    }

    function updateOrderExpirationTime(
        uint256 _orderId,
        uint256 _expirationTime
    ) external nonReentrant validOrderId(_orderId) {
        UserOrderDetails memory userOrderDetails = _orderPreCheck(_orderId);
        OrderDetailsWithId storage orderDetailsWithId = orders[msg.sender][userOrderDetails.orderIndex];

        require(_expirationTime > block.timestamp, "otc:expiration time should be in future");

        if (orderDetailsWithId.orderDetails.expirationTime != _expirationTime) {
            orderDetailsWithId.orderDetails.expirationTime = _expirationTime;
        }
        orderDetailsWithId.lastUpdateTime = uint32(block.timestamp);

        emit OrderUpdated(_orderId);
    }

    function executeOrder(
        uint256 _orderId,
        uint256 _buyTokenIndexInOrder,
        uint256 _buyAmount
    ) external payable nonReentrant validOrderId(_orderId) {
        (address _buyToken, address _sellToken, uint256 _soldAmount, uint256 _fees) = _executeOrder(
            _orderId,
            _buyTokenIndexInOrder,
            _buyAmount
        );

        if (_buyToken == NATIVE_ADDRESS) {
            require(msg.value >= _buyAmount, "otc:not enough tokens provided");

            uint256 extraTokens = msg.value - _buyAmount;
            if (_fees > 0) {
                _sendNativeTokenToAdmin(_fees);
            }
            if (extraTokens > 0) {
                _sendNativeToken(extraTokens);
            }
        } else {
            uint256 buyTokenAmountBefore = IERC20(_buyToken).balanceOf(address(this));
            IERC20(_buyToken).safeTransferFrom(msg.sender, address(this), _buyAmount);
            uint256 buyTokenAmountAfter = IERC20(_buyToken).balanceOf(address(this));
            require(
                buyTokenAmountAfter - buyTokenAmountBefore == _buyAmount,
                "otc:buy amount is not transferred correctly"
            );
            IERC20(_buyToken).safeTransfer(adminWallet, _fees);
        }

        if (_sellToken == NATIVE_ADDRESS) {
            _sendNativeToken(_soldAmount);
        } else {
            IERC20(_sellToken).safeTransfer(msg.sender, _soldAmount);
        }
    }

    function executeMultipleOrder(
        uint256[] calldata _orderIds,
        uint256[] calldata _buyTokenIndexInOrder,
        uint256 _sellTokenAmount
    ) external payable nonReentrant {
        uint256 originalSellTokenAmount = _sellTokenAmount;
        address sellToken;
        uint256 nativeBalanceNeeded = 0;
        uint256 nativeFeesNeeded = 0;
        for (uint256 i = 0; i < _orderIds.length; i++) {
            require(_orderIds[i] <= orderCounter, "otc:Invalid order ID");
            uint256 orderId = _orderIds[i];
            uint256 buyingAmount = 0;
            {
                UserOrderDetails memory userOrderDetails = userDetailsByOrderId[orderId];

                OrderDetailsWithId memory orderDetailsWithId = orders[userOrderDetails.orderOwner][
                    userOrderDetails.orderIndex
                ];

                uint256 buyTokenAmountInOrder = orderDetailsWithId.orderDetails.buyAmounts[_buyTokenIndexInOrder[i]];

                uint256 remainingSellTokenAmountForThisOrder = (orderDetailsWithId.orderDetails.sellAmount *
                    orderDetailsWithId.remainingExecutionPercentage) / DIVISOR;

                uint256 remainingBuyTokenAmountInOrder = (buyTokenAmountInOrder *
                    orderDetailsWithId.remainingExecutionPercentage) / DIVISOR;

                if (remainingSellTokenAmountForThisOrder < _sellTokenAmount) {
                    buyingAmount = remainingBuyTokenAmountInOrder;
                    _sellTokenAmount -= remainingSellTokenAmountForThisOrder;
                } else {
                    uint256 percentageUtlisation = (_sellTokenAmount * DIVISOR) / remainingSellTokenAmountForThisOrder;
                    buyingAmount = (remainingBuyTokenAmountInOrder * percentageUtlisation) / DIVISOR;
                    _sellTokenAmount = 0;
                }
            }
            address tempBuyToken;
            address tempSellToken;
            uint256 _fees;

            if (i == 0) {
                (tempBuyToken, sellToken, , _fees) = _executeOrder(orderId, _buyTokenIndexInOrder[i], buyingAmount);
            } else {
                (tempBuyToken, tempSellToken, , _fees) = _executeOrder(orderId, _buyTokenIndexInOrder[i], buyingAmount);
                require(tempSellToken == sellToken, "otc:sell token should be same for all orders");
            }

            if (tempBuyToken == NATIVE_ADDRESS) {
                nativeBalanceNeeded += buyingAmount;
                nativeFeesNeeded += _fees;
            } else {
                uint256 buyTokenBalanceBefore = IERC20(tempBuyToken).balanceOf(address(this));
                IERC20(tempBuyToken).safeTransferFrom(msg.sender, address(this), buyingAmount);
                uint256 buyTokenBalanceAfter = IERC20(tempBuyToken).balanceOf(address(this));

                require(
                    buyTokenBalanceAfter - buyTokenBalanceBefore == buyingAmount,
                    "otc:buy amount is not transferred correctly"
                );
                IERC20(tempBuyToken).safeTransfer(adminWallet, _fees);
            }

            if (_sellTokenAmount == 0) {
                break;
            }
        }

        if (nativeBalanceNeeded > 0) {
            require(msg.value >= nativeBalanceNeeded, "otc:not enough native tokens provided");

            uint256 extraTokens = msg.value - nativeBalanceNeeded;
            if (nativeFeesNeeded > 0) {
                _sendNativeTokenToAdmin(nativeFeesNeeded);
            }
            if (extraTokens > 0) {
                _sendNativeToken(extraTokens);
            }
        }

        uint256 required = originalSellTokenAmount - _sellTokenAmount;
        if (sellToken == NATIVE_ADDRESS) {
            _sendNativeToken(required);
        } else {
            IERC20(sellToken).safeTransfer(msg.sender, required);
        }
    }

    function redeemOrder(uint256 _orderId) public nonReentrant validOrderId(_orderId) {
        _redeemOrder(_orderId);
    }

    function redeemMultipleOrders(uint256[] memory _orderIds) external {
        for (uint256 i = 0; i < _orderIds.length; i++) {
            uint256 orderId = _orderIds[i];
            redeemOrder(orderId);
        }
    }

    function getUserOrdersLength(address _user) external view returns (uint256 _length) {
        return orders[_user].length;
    }

    function viewUserAllOrders(
        address _user,
        uint256 _cursor,
        uint256 _size
    ) external view returns (OrderDetailsWithId[] memory, uint256) {
        uint256 length = _size;

        if (length > orders[_user].length - _cursor) {
            length = orders[_user].length - _cursor;
        }

        OrderDetailsWithId[] memory userOrders = new OrderDetailsWithId[](length);

        for (uint256 i = 0; i < length; i++) {
            userOrders[i] = orders[_user][_cursor + i];
        }

        return (userOrders, _cursor + length);
    }

    function viewUserCompletedOrders(
        address _user,
        uint256 _cursor,
        uint256 _size
    ) external view returns (OrderDetailsWithId[] memory, uint256) {
        return _viewUserOrdersWithStatus(_user, _cursor, _size, OrderStatus.Completed);
    }

    function viewUserActiveOrders(
        address _user,
        uint256 _cursor,
        uint256 _size
    ) external view returns (OrderDetailsWithId[] memory, uint256) {
        return _viewUserOrdersWithStatus(_user, _cursor, _size, OrderStatus.Active);
    }

    function viewUserCancelledOrders(
        address _user,
        uint256 _cursor,
        uint256 _size
    ) external view returns (OrderDetailsWithId[] memory, uint256) {
        return _viewUserOrdersWithStatus(_user, _cursor, _size, OrderStatus.Cancelled);
    }

    function getOrderDetails(
        uint256 _orderId
    ) external view validOrderId(_orderId) returns (CompleteOrderDetails memory) {
        require(_orderId <= orderCounter, "Invalid order ID");

        UserOrderDetails memory userDetails = userDetailsByOrderId[_orderId];
        OrderDetailsWithId memory orderDetailsWithId = orders[userDetails.orderOwner][userDetails.orderIndex];

        return CompleteOrderDetails({userDetails: userDetails, orderDetailsWithId: orderDetailsWithId});
    }

    function getAvailableRedeemableTokens(uint256 _orderId) external view returns (uint256[] memory _amounts) {
        UserOrderDetails memory userDetails = userDetailsByOrderId[_orderId];
        OrderDetailsWithId memory orderDetailsWithId = orders[userDetails.orderOwner][userDetails.orderIndex];

        uint256[] memory buyTokensIndex = orderDetailsWithId.orderDetails.buyTokensIndex;
        _amounts = new uint256[](buyTokensIndex.length);
        for (uint i = 0; i < buyTokensIndex.length; i++) {
            uint256 amount = buyTransactionsByOrderId[_orderId][buyTokensIndex[i]];
            _amounts[i] = amount;
        }
    }

    function getOrderCounter() external view returns (uint256) {
        return orderCounter;
    }

    function getAdminWalletAddress() external view returns (address) {
        return adminWallet;
    }

    function getUniswapAnchorViewAddress() external view returns (address) {
        return uniswapAnchorView;
    }

    function getBistroStakingAddress() external view returns (address) {
        return bistroStaking;
    }

    function getBeanTokenAddress() external view returns (address) {
        return beanToken;
    }

    function getRedeemFees() external view returns (uint256) {
        return redeemFees;
    }

    function getDiscountInRedeemFees() external view returns (uint256) {
        return discountInRedeemFees;
    }

    function getListingFeesInUSD() external view returns (uint256) {
        return listingFeesInUSD;
    }

    function getCooldownPeriod() external view returns (uint32) {
        return cooldownPeriod;
    }

    function _executeOrder(
        uint256 _orderId,
        uint256 _buyTokenIndexInOrder,
        uint256 _buyAmount
    ) internal returns (address _buyTokenAddress, address _sellTokenAddress, uint256 _soldAmount, uint256 _fees) {
        OrderDetailsWithId storage orderDetailsWithId;
        address orderOwner;
        uint256 soldAmount;
        uint256 buyTokenIndex;
        {
            UserOrderDetails memory userOrderDetails = userDetailsByOrderId[_orderId];

            orderDetailsWithId = orders[userOrderDetails.orderOwner][userOrderDetails.orderIndex];

            orderOwner = userOrderDetails.orderOwner;

            require(
                orderDetailsWithId.lastUpdateTime + cooldownPeriod < uint32(block.timestamp),
                "otc:order in cooldown"
            );

            require(orderDetailsWithId.status == OrderStatus.Active, "otc:order is not active");

            require(orderDetailsWithId.orderDetails.expirationTime > block.timestamp, "otc:order expired");

            buyTokenIndex = orderDetailsWithId.orderDetails.buyTokensIndex[_buyTokenIndexInOrder];

            (_buyTokenAddress, ) = getTokenInfoAt(buyTokenIndex);

            uint256 originalBuyAmount = orderDetailsWithId.orderDetails.buyAmounts[_buyTokenIndexInOrder];

            uint256 percentage = (_buyAmount * DIVISOR) / originalBuyAmount;

            require(orderDetailsWithId.remainingExecutionPercentage >= percentage, "otc:not enough available to sell");

            soldAmount = (orderDetailsWithId.orderDetails.sellAmount * percentage) / DIVISOR;

            orderDetailsWithId.remainingExecutionPercentage =
                orderDetailsWithId.remainingExecutionPercentage -
                percentage;

            if (orderDetailsWithId.remainingExecutionPercentage == 0) {
                orderDetailsWithId.status = OrderStatus.Completed;
            }
        }

        {
            uint256 applicableRedeemFees = _checkDiscount(orderOwner);
            uint256 _newBoughtAmount;
            if (applicableRedeemFees > 0) {
                _fees = (_buyAmount * applicableRedeemFees) / PECENTAGE_DIVISOR;
                _newBoughtAmount = _buyAmount - _fees;
            }

            buyTransactionsByOrderId[_orderId][buyTokenIndex] += _newBoughtAmount;
        }

        emit OrderExecuted(msg.sender, _orderId);

        return (_buyTokenAddress, orderDetailsWithId.orderDetails.sellToken, soldAmount, _fees);
    }

    function _redeemOrder(uint256 _orderId) internal {
        UserOrderDetails memory userOrderDetails = userDetailsByOrderId[_orderId];
        require(userOrderDetails.orderOwner == msg.sender, "otc:Unauthorized");
        OrderDetailsWithId storage orderDetailsWithId = orders[msg.sender][userOrderDetails.orderIndex];
        uint256 redeemable = DIVISOR -
            orderDetailsWithId.remainingExecutionPercentage -
            orderDetailsWithId.redemeedPercentage;

        orderDetailsWithId.redemeedPercentage = orderDetailsWithId.redemeedPercentage + redeemable;

        _burn(msg.sender, ((orderDetailsWithId.orderDetails.sellAmount * redeemable) / 10 ** 18));

        for (uint256 i = 0; i < orderDetailsWithId.orderDetails.buyTokensIndex.length; i++) {
            uint256 currentBuyTokenIndex = orderDetailsWithId.orderDetails.buyTokensIndex[i];

            (address currentBuyToken, ) = getTokenInfoAt(currentBuyTokenIndex);
            uint256 boughtAmount = buyTransactionsByOrderId[_orderId][currentBuyTokenIndex];
            if (boughtAmount > 0) {
                buyTransactionsByOrderId[_orderId][currentBuyTokenIndex] = 0;
                if (currentBuyToken == NATIVE_ADDRESS) {
                    _sendNativeToken(boughtAmount);
                } else {
                    IERC20(currentBuyToken).safeTransfer(msg.sender, boughtAmount);
                }
            }
        }

        emit OrderRedeemded(msg.sender, _orderId);
    }

    function _orderPreCheck(uint256 _orderId) internal view returns (UserOrderDetails memory) {
        UserOrderDetails memory userOrderDetails = userDetailsByOrderId[_orderId];
        OrderDetailsWithId memory orderDetailsWithId = orders[userOrderDetails.orderOwner][userOrderDetails.orderIndex];
        require(userOrderDetails.orderOwner == msg.sender, "otc:Unauthorized");
        require(orderDetailsWithId.status == OrderStatus.Active, "otc:order is not active");
        return userOrderDetails;
    }

    function _checkTokenAndAmount(uint256[] calldata _tokensIndex, uint256[] calldata _amounts) internal view {
        require(_tokensIndex.length == _amounts.length, "otc:buy token and buy amount should be of same length");

        for (uint256 i; i < _tokensIndex.length; i++) {
            (, bool active) = getTokenInfoAt(_tokensIndex[i]);
            require(active, "otc:invalid index");
            require(_amounts[i] > 0, "otc:buy amount should not be zero");
        }
    }

    function _viewUserOrdersWithStatus(
        address _user,
        uint256 _cursor,
        uint256 _size,
        OrderStatus _status
    ) internal view returns (OrderDetailsWithId[] memory, uint256) {
        uint256 length = _size;
        uint256 ordersLength = orders[_user].length;
        if (length > ordersLength - _cursor) {
            length = ordersLength - _cursor;
        }
        OrderDetailsWithId[] memory userOrders = new OrderDetailsWithId[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 index = _cursor + i;

            if (userOrders[index].status == _status) {
                userOrders[i] = orders[_user][index];
            }
        }
        return (userOrders, _cursor + length);
    }

    function _sendNativeToken(uint _amount) internal {
        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        require(sent, "otc: failed to send Ether");
    }

    function _sendNativeTokenToAdmin(uint _amount) internal {
        (bool sent, ) = payable(adminWallet).call{value: _amount}("");
        require(sent, "otc: failed to send Ether");
    }

    function _checkDiscount(address _user) internal view returns (uint256) {
        (IBistroStaking.StakeInfo memory stakeInfo, ) = IBistroStaking(bistroStaking).getUserStake(_user);
        bool isDiscount = stakeInfo.active;
        uint256 applicableRedeemFees = redeemFees;

        if (isDiscount) {
            applicableRedeemFees = (applicableRedeemFees -
                ((applicableRedeemFees * discountInRedeemFees) / PECENTAGE_DIVISOR));
        }
        return applicableRedeemFees;
    }

    function _updateAdminWallet(address _newAdminWallet) internal {
        require(_newAdminWallet != address(0), "OTC: Invalid admin wallet address");
        require(_newAdminWallet != adminWallet, "OTC: Same admin wallet address");
        adminWallet = _newAdminWallet;
    }

    function _updateUniswapAnchor(address _newUniswapAnchor) internal {
        require(_newUniswapAnchor != address(0), "OTC: Invalid uniswap anchor address");
        uniswapAnchorView = _newUniswapAnchor;
    }

    function _updateBeanToken(address _newBeanToken) internal {
        require(_newBeanToken != address(0), "OTC: Invalid bean token address");
        beanToken = _newBeanToken;
    }

    function _updateBistroStaking(address _newBistroStaking) internal {
        require(_newBistroStaking != address(0), "OTC: Invalid bistro staking address");
        bistroStaking = _newBistroStaking;
    }

    function _updateRedeemFees(uint256 _newRedeemFees) internal {
        require(_newRedeemFees <= REDEEM_FEES_LIMIT, "OTC: Redeem fees cannot exceed limit");
        redeemFees = _newRedeemFees;
    }

    function _updateDiscountInRedeemFees(uint256 _newDiscountInRedeemFees) internal {
        require(_newDiscountInRedeemFees <= PECENTAGE_DIVISOR, "OTC: Redeem fees discount cannot exceed 100%");
        discountInRedeemFees = _newDiscountInRedeemFees;
    }

    function _updateListingFees(uint256 _amountInUSD) internal {
        require(_amountInUSD <= LISTING_FEES_LIMIT, "OTC:Listing Fees cannot exceed limit");
        listingFeesInUSD = _amountInUSD;
    }

    function _updateCoolDownPeriod(uint32 _cooldownDuration) internal {
        cooldownPeriod = _cooldownDuration;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        revert("OTC:Transfer not supported");
    }

    function approve(address spender, uint256 value) public override returns (bool) {
        revert("OTC:Approve not supported");
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        revert("OTC:TransferFrom not supported");
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        revert("OTC:Allowance not supported");
    }

    function decimals() public view override returns (uint8) {
        revert("OTC:Decimals not supported");
    }
}
