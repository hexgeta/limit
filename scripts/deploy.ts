import { ethers } from "hardhat";

async function main() {
  const tradingFeePercent = 25; // 0.25% fee

  console.log("Deploying OTC Desk contract...");
  
  const OTCDesk = await ethers.getContractFactory("OTCDesk");
  const otcDesk = await OTCDesk.deploy(tradingFeePercent);
  
  await otcDesk.waitForDeployment();
  
  console.log(`OTC Desk deployed to: ${await otcDesk.getAddress()}`);
  console.log(`Initial trading fee: ${tradingFeePercent / 100}%`);

  // Verify the contract on the block explorer
  if (process.env.PULSESCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    await otcDesk.deploymentTransaction()?.wait(6);
    
    console.log("Verifying contract...");
    await run("verify:verify", {
      address: await otcDesk.getAddress(),
      constructorArguments: [tradingFeePercent],
    });
    console.log("Contract verified!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 