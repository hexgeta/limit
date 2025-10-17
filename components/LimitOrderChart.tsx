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
}

export function LimitOrderChart({ sellTokenAddress, buyTokenAddress }: LimitOrderChartProps) {
  const [historicData, setHistoricData] = useState<ChartData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('24h');

  // Default to USDL if no sell token provided
  const tokenAddress = sellTokenAddress || '0x0deed1486bc52aa0d3e6f8849cec5add6598a162'; // USDL

  useEffect(() => {
    fetchDexScreenerData();
  }, [tokenAddress, timeRange]);

  const fetchDexScreenerData = async () => {
    if (!tokenAddress) return;
    
    setLoading(true);
    try {
      // Find the token config to get the pair address
      const tokenConfig = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === tokenAddress.toLowerCase());
      
      if (!tokenConfig || !tokenConfig.dexs) {
        setHistoricData([]);
        setLoading(false);
        return;
      }

      const pairAddress = Array.isArray(tokenConfig.dexs) ? tokenConfig.dexs[0] : tokenConfig.dexs;
      
      // Fetch pair data from DexScreener
      const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${pairAddress}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch DexScreener data');
      }

      const data = await response.json();
      const pair = data.pairs?.[0];
      
      if (pair && pair.priceUsd) {
        // Set current price
        setCurrentPrice(parseFloat(pair.priceUsd));
        
        // DexScreener doesn't provide historical price arrays in their free API
        // So we'll use the current price changes to show a simple chart
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        
        // Create mock historical data based on price changes
        const chartData: ChartData[] = [];
        const priceChange = pair.priceChange?.[timeRange === '1h' ? 'h1' : timeRange === '6h' ? 'h6' : 'h24'] || 0;
        const currentPriceNum = parseFloat(pair.priceUsd);
        const oldPrice = currentPriceNum / (1 + priceChange / 100);
        
        // Generate data points
        const points = 20;
        const timeStep = timeRange === '1h' ? hourInMs / points : timeRange === '6h' ? (6 * hourInMs) / points : (24 * hourInMs) / points;
        
        for (let i = 0; i <= points; i++) {
          const ratio = i / points;
          const price = oldPrice + (currentPriceNum - oldPrice) * ratio;
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

  const tokenInfo = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === tokenAddress.toLowerCase());

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg">
          <p className="text-white text-sm">{payload[0].payload.date}</p>
          <p className="text-green-400 text-sm font-semibold">
            ${payload[0].value.toFixed(6)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-black/40 border border-gray-800 rounded-lg p-6">
      {/* Controls */}
      <div className="flex justify-between items-center gap-4 mb-6">
        {/* Token Info */}
        {tokenInfo && (
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-bold text-white">{tokenInfo.ticker}</h3>
            {currentPrice && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Current Price:</span>
                <span className="text-green-400 text-xl font-semibold">${currentPrice.toFixed(6)}</span>
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-400'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
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
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => {
                // Show fewer ticks on mobile
                return value;
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => `$${value.toFixed(6)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: '#9CA3AF' }}
              iconType="line"
            />
            
            {/* Historic Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Market Price"
              activeDot={{ r: 6 }}
            />
            
            {/* Current Price Reference Line */}
            {currentPrice && (
              <ReferenceLine
                y={currentPrice}
                stroke="#A855F7"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Current: $${currentPrice.toFixed(6)}`,
                  fill: '#A855F7',
                  fontSize: 12,
                  position: 'right',
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Chart Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-green-500"></div>
          <span className="text-gray-400">Price Trend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-purple-500"></div>
          <span className="text-gray-400">Current Price</span>
        </div>
      </div>
    </div>
  );
}

