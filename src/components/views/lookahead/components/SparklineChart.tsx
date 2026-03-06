import React from 'react';

const SparklineChart: React.FC<{ data: number[] }> = ({ data }) => {
  const width = 120;
  const height = 24;
  const strokeWidth = 2;

  if (data.length < 2) return null;

  const yMin = Math.min(...data);
  const yMax = Math.max(...data);
  const xStep = width / (data.length - 1);

  const getSvgY = (y: number) => {
    if (yMax === yMin) return height / 2;
    return height - strokeWidth - ((y - yMin) / (yMax - yMin)) * (height - 2 * strokeWidth);
  };

  const pathData = data.map((point, i) => {
    const x = i * xStep;
    const y = getSvgY(point);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  
  const trendColor = data[data.length - 1] >= data[data.length - 2] ? 'stroke-green-500' : 'stroke-red-500';

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={pathData} fill="none" className={trendColor} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="text-sm font-semibold text-gray-700">{data[data.length - 1]}%</span>
    </div>
  );
};

export default SparklineChart;