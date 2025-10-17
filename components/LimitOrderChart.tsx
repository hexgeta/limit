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

interface HistoricPrice {
  timestamp: string;
  price: number;
  token_address: string;
}

interface ChartData {
  date: string;
  price: number;
  timestamp: number;
}

export function LimitOrderChart() {
  const [selectedToken, setSelectedToken] = useState<string>('0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b'); // MAXI
  const [historicData, setHistoricData] = useState<ChartData[]>([]);
  const [otcPrice, setOtcPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Get list of tokens for dropdown
  const tokenOptions = TOKEN_CONSTANTS.filter(token => 
    token.isWhitelisted && token.a && token.a !== '0x000000000000000000000000000000000000dEaD'
  );

  useEffect(() => {
    fetchHistoricData();
  }, [selectedToken, timeRange]);

  const fetchHistoricData = async () => {
    if (!selectedToken) return;
    
    setLoading(true);
    try {
      // Calculate limit based on timeRange
      const limits: Record<typeof timeRange, number> = {
        '7d': 168,    // 7 days * 24 hours
        '30d': 720,   // 30 days * 24 hours
        '90d': 2160,  // 90 days * 24 hours
        'all': 1000,
      };

      const response = await fetch(
        `/api/prices/historic?token=${selectedToken}&limit=${limits[timeRange]}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch historic data');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Transform data for recharts
        const chartData: ChartData[] = result.data
          .map((item: HistoricPrice) => ({
            date: new Date(item.timestamp).toLocaleDateString(),
            price: item.price,
            timestamp: new Date(item.timestamp).getTime(),
          }))
          .reverse(); // Reverse to show oldest to newest

        setHistoricData(chartData);
        
        // Set OTC price as the most recent price (you can adjust this logic)
        if (chartData.length > 0) {
          setOtcPrice(chartData[chartData.length - 1].price);
        }
      }
    } catch (error) {
      console.error('Error fetching historic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTokenInfo = tokenOptions.find(t => t.a?.toLowerCase() === selectedToken.toLowerCase());

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm">Select Token</label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
          >
            {tokenOptions.map((token) => (
              <option key={token.a} value={token.a}>
                {token.ticker} - {token.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-400'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
              }`}
            >
              {range === 'all' ? 'All' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Info */}
      {selectedTokenInfo && (
        <div className="mb-4 flex items-center gap-4">
          <h3 className="text-2xl font-bold text-white">{selectedTokenInfo.ticker}</h3>
          {otcPrice && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">OTC Price:</span>
              <span className="text-green-400 text-xl font-semibold">${otcPrice.toFixed(6)}</span>
            </div>
          )}
        </div>
      )}

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
            
            {/* OTC Price Reference Line */}
            {otcPrice && (
              <ReferenceLine
                y={otcPrice}
                stroke="#A855F7"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `OTC: $${otcPrice.toFixed(6)}`,
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
          <span className="text-gray-400">Market Price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-purple-500"></div>
          <span className="text-gray-400">OTC Price (Current)</span>
        </div>
      </div>
    </div>
  );
}

