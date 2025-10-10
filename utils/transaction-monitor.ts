import { Transaction, MonitoringConfig } from '@/types/transactions'

export async function fetchTransactions(
  address: string,
  apiKey: string,
  config: MonitoringConfig
): Promise<Transaction[]> {
  const transactions: Transaction[] = []
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600

  // Fetch normal ETH transactions
  if (config.ETH_TRANSFERS) {
    const ethUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`
    const ethResponse = await fetch(ethUrl)
    const ethData = await ethResponse.json()
    
    if (ethData.status === '1' && ethData.result?.length > 0) {
      const ethTxs = ethData.result
        .filter((tx: any) => {
          const isRecentTx = parseInt(tx.timeStamp) >= oneHourAgo
          const hasValue = tx.value !== '0'
          if (isRecentTx && hasValue) {