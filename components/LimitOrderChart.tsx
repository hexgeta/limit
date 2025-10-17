'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

interface ChartData {
  date: string;
  price: number;
  timestamp: number;
}

interface LimitOrderChartProps {
  sellTokenAddress?: string;
  buyTokenAddress?: string;
  limitOrderPrice?: number;
}

export function LimitOrderChart({ sellTokenAddress, buyTokenAddress, limitOrderPrice }: LimitOrderChartProps) {
  const [historicData, setHistoricData] = useState<ChartData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('24h');

  // Default to USDL -> HEX if no tokens provided
  const sellToken = sellTokenAddress || '0x0deed1486bc52aa0d3e6f8849cec5add6598a162'; // USDL
  const buyToken = buyTokenAddress || '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'; // HEX

  useEffect(() => {
    fetchDexScreenerData();
  }, [sellToken, buyToken, timeRange]);

  const fetchDexScreenerData = async () => {
    if (!sellToken || !buyToken) return;
    
    setLoading(true);
    try {
      // Fetch both token configs
      const sellTokenConfig = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === sellToken.toLowerCase());
      const buyTokenConfig = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === buyToken.toLowerCase());
      
      if (!sellTokenConfig?.dexs || !buyTokenConfig?.dexs) {
        setHistoricData([]);
        setLoading(false);
        return;
      }

      // Get pair addresses
      const sellPairAddress = Array.isArray(sellTokenConfig.dexs) ? sellTokenConfig.dexs[0] : sellTokenConfig.dexs;
      const buyPairAddress = Array.isArray(buyTokenConfig.dexs) ? buyTokenConfig.dexs[0] : buyTokenConfig.dexs;
      
      // Fetch both token prices from DexScreener
      const [sellResponse, buyResponse] = await Promise.all([
        fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${sellPairAddress}`),
        fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${buyPairAddress}`)
      ]);
      
      if (!sellResponse.ok || !buyResponse.ok) {
        throw new Error('Failed to fetch DexScreener data');
      }

      const [sellData, buyData] = await Promise.all([
        sellResponse.json(),
        buyResponse.json()
      ]);
      
      const sellPair = sellData.pairs?.[0];
      const buyPair = buyData.pairs?.[0];
      
      if (sellPair && buyPair && sellPair.priceUsd && buyPair.priceUsd) {
        const sellPriceUsd = parseFloat(sellPair.priceUsd);
        const buyPriceUsd = parseFloat(buyPair.priceUsd);
        
        // Calculate ratio: how many buy tokens per sell token
        const currentRatio = sellPriceUsd / buyPriceUsd;
        setCurrentPrice(currentRatio);
        
        // Use average price change of both tokens for historical data
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        
        const timeKey = timeRange === '1h' ? 'h1' : timeRange === '6h' ? 'h6' : 'h24';
        const sellPriceChange = sellPair.priceChange?.[timeKey] || 0;
        const buyPriceChange = buyPair.priceChange?.[timeKey] || 0;
        
        // Calculate historical ratio
        const oldSellPrice = sellPriceUsd / (1 + sellPriceChange / 100);
        const oldBuyPrice = buyPriceUsd / (1 + buyPriceChange / 100);
        const oldRatio = oldSellPrice / oldBuyPrice;
        
        // Generate data points
        const chartData: ChartData[] = [];
        const points = 20;
        const timeStep = timeRange === '1h' ? hourInMs / points : timeRange === '6h' ? (6 * hourInMs) / points : (24 * hourInMs) / points;
        
        for (let i = 0; i <= points; i++) {
          const ratio = i / points;
          const price = oldRatio + (currentRatio - oldRatio) * ratio;
          const timestamp = now - (points - i) * timeStep;
          
          chartData.push({
            date: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: price,
            timestamp: timestamp,
          });
        }
        
        setHistoricData(chartData);
      }
    } catch (error) {
      console.error('Error fetching DexScreener data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sellTokenInfo = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === sellToken.toLowerCase());
  const buyTokenInfo = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === buyToken.toLowerCase());

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black border-2 border-[#00D9FF] p-3 shadow-[0_0_20px_rgba(0,217,255,0.5)]">
          <p className="text-[#00D9FF]/70 text-sm">{payload[0].payload.date}</p>
          <p className="text-[#00D9FF] text-sm font-semibold drop-shadow-[0_0_5px_rgba(0,217,255,0.8)]">
            {payload[0].value.toFixed(6)} {buyTokenInfo?.ticker || ''} per {sellTokenInfo?.ticker || ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-black/80 backdrop-blur-sm border-2 border-[#00D9FF] p-6 shadow-[0_0_30px_rgba(0,217,255,0.3)]">
      {/* Controls */}
      <div className="flex justify-between items-center gap-4 mb-6">
        {/* Token Pair Info */}
        {sellTokenInfo && buyTokenInfo && (
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-bold text-[#00D9FF] drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]">
              {buyTokenInfo.ticker}/{sellTokenInfo.ticker}
            </h3>
            {currentPrice && (
              <div className="flex items-center gap-2">
                <span className="text-[#00D9FF]/70">Rate:</span>
                <span className="text-[#00D9FF] text-xl font-semibold drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]">
                  {currentPrice.toFixed(6)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Time Range Buttons */}
        <div className="flex gap-2">
          {(['1h', '6h', '24h'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-300 border-2 ${
                timeRange === range
                  ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.5)]'
                  : 'bg-black text-[#00D9FF]/50 border-[#00D9FF]/30 hover:border-[#00D9FF] hover:text-[#00D9FF] hover:shadow-[0_0_10px_rgba(0,217,255,0.4)]'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      ) : historicData.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">No historic data available for this token</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={historicData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#00D9FF" strokeOpacity={0.2} />
            <XAxis
              dataKey="date"
              stroke="#00D9FF"
              tick={{ fill: '#00D9FF' }}
              tickFormatter={(value) => {
                // Show fewer ticks on mobile
                return value;
              }}
            />
            <YAxis
              stroke="#00D9FF"
              tick={{ fill: '#00D9FF' }}
              tickFormatter={(value) => value.toFixed(6)}
              domain={(() => {
                // Calculate min/max from historic data
                const prices = historicData.map(d => d.price);
                let min = Math.min(...prices);
                let max = Math.max(...prices);
                
                // Include limit order price in domain if it exists
                if (limitOrderPrice) {
                  min = Math.min(min, limitOrderPrice);
                  max = Math.max(max, limitOrderPrice);
                }
                
                // Include current price
                if (currentPrice) {
                  min = Math.min(min, currentPrice);
                  max = Math.max(max, currentPrice);
                }
                
                // Add 10% padding on top and bottom for better visibility
                const padding = (max - min) * 0.1;
                return [Math.max(0, min - padding), max + padding];
              })()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: '#00D9FF' }}
              iconType="line"
            />
            
            {/* Historic Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#00D9FF"
              strokeWidth={3}
              dot={false}
              name="Market Price"
              activeDot={{ r: 8, fill: '#00D9FF', stroke: '#000', strokeWidth: 2 }}
            />
            
            {/* Current Price Reference Line */}
            {currentPrice && (
              <ReferenceLine
                y={currentPrice}
                stroke="#00D9FF"
                strokeWidth={3}
                strokeDasharray="5 5"
                label={{
                  value: `Current: ${currentPrice.toFixed(6)}`,
                  fill: '#00D9FF',
                  fontSize: 12,
                  position: 'right',
                  style: { textShadow: '0 0 10px rgba(0,217,255,0.8)' }
                }}
              />
            )}
            
            {/* Limit Order Price Reference Line (Pink) */}
            {limitOrderPrice && (
              <ReferenceLine
                y={limitOrderPrice}
                stroke="#FF0080"
                strokeWidth={3}
                strokeDasharray="8 4"
                label={{
                  value: `Limit: ${limitOrderPrice.toFixed(6)}`,
                  fill: '#FF0080',
                  fontSize: 12,
                  position: 'left',
                  style: { textShadow: '0 0 10px rgba(255,0,128,0.8)' }
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Chart Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-[#00D9FF] shadow-[0_0_10px_rgba(0,217,255,0.8)]"></div>
          <span className="text-[#00D9FF]">Price Trend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 border-t-2 border-dashed border-[#00D9FF] shadow-[0_0_10px_rgba(0,217,255,0.8)]"></div>
          <span className="text-[#00D9FF]">Current Price</span>
        </div>
        {limitOrderPrice && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 border-t-2 border-dashed border-[#FF0080] shadow-[0_0_10px_rgba(255,0,128,0.8)]"></div>
            <span className="text-[#FF0080]">Limit Order Price</span>
          </div>
        )}
      </div>
    </div>
  );
}

