import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PortfolioAllocation } from '../../services/PortfolioManager';

interface PortfolioAllocationChartProps {
  allocations: PortfolioAllocation[];
  accountNames: Record<string, string>;
}

export function PortfolioAllocationChart({ allocations, accountNames }: PortfolioAllocationChartProps) {
  const COLORS = ['#60A5FA', '#34D399', '#F87171', '#FBBF24', '#A78BFA', '#F472B6', '#38BDF8', '#FB923C'];

  const data = allocations.map((allocation, index) => ({
    name: accountNames[allocation.accountId] || `Account ${index + 1}`,
    value: allocation.allocationPercent,
    maxRisk: allocation.maxRiskPercent,
    currentRisk: allocation.currentRiskPercent,
    accountId: allocation.accountId,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{payload[0].payload.name}</p>
          <p className="text-gray-300 text-sm">
            Allocation: <span className="text-blue-400">{payload[0].value.toFixed(1)}%</span>
          </p>
          <p className="text-gray-300 text-sm">
            Max Risk: <span className="text-yellow-400">{payload[0].payload.maxRisk.toFixed(1)}%</span>
          </p>
          <p className="text-gray-300 text-sm">
            Current Risk: <span className="text-green-400">{payload[0].payload.currentRisk.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Portfolio Allocation</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => <span className="text-gray-300">{value}</span>}
              layout="vertical"
              verticalAlign="middle"
              align="right"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item, index) => (
          <div key={item.accountId} className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="text-white font-medium">{item.name}</div>
            </div>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Allocation</span>
                  <span>{item.value.toFixed(1)}%</span>
                </div>
                <div className="bg-gray-600 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Risk Utilization</span>
                  <span>{item.currentRisk.toFixed(1)}% of {item.maxRisk.toFixed(1)}%</span>
                </div>
                <div className="bg-gray-600 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      item.currentRisk / item.maxRisk > 0.8 ? 'bg-red-500' :
                      item.currentRisk / item.maxRisk > 0.5 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${(item.currentRisk / item.maxRisk) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}