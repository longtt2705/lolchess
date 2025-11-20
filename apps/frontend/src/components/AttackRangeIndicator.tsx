import React from 'react';
import styled from 'styled-components';

interface AttackRangeIndicatorProps {
  attackRange: {
    horizontal?: boolean;
    vertical?: boolean;
    diagonal?: boolean;
    lShape?: boolean;
  };
  size?: number;
}

const IndicatorContainer = styled.div<{ size: number }>`
  position: relative;
  display: inline-block;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  cursor: help;

  .tooltip {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--secondary-bg);
    color: var(--primary-text);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px 12px;
    white-space: nowrap;
    font-size: 12px;
    z-index: 1000;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--border);
  }

  &:hover .tooltip {
    visibility: visible;
    opacity: 1;
  }
`;

const SVGContainer = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
`;

export const AttackRangeIndicator: React.FC<AttackRangeIndicatorProps> = ({ 
  attackRange, 
  size = 48 
}) => {
  const center = size / 2;
  const lineLength = size * 0.35;
  const centerSquareSize = size * 0.15;
  const lShapeDotRadius = size * 0.06;
  
  // Knight movement offsets (normalized to grid positions)
  const knightOffsets = [
    { x: 2, y: 1 },   // Right 2, Up 1
    { x: 2, y: -1 },  // Right 2, Down 1
    { x: -2, y: 1 },  // Left 2, Up 1
    { x: -2, y: -1 }, // Left 2, Down 1
    { x: 1, y: 2 },   // Right 1, Up 2
    { x: 1, y: -2 },  // Right 1, Down 2
    { x: -1, y: 2 },  // Left 1, Up 2
    { x: -1, y: -2 }, // Left 1, Down 2
  ];

  // Scale knight offsets to pixel positions
  const knightScale = size * 0.15;
  const knightPositions = knightOffsets.map(offset => ({
    x: center + offset.x * knightScale,
    y: center - offset.y * knightScale, // Invert y for SVG coordinates
  }));

  // Build tooltip text
  const getTooltipText = (): string => {
    const directions: string[] = [];
    if (attackRange.horizontal) directions.push('Horizontal');
    if (attackRange.vertical) directions.push('Vertical');
    if (attackRange.diagonal) directions.push('Diagonal');
    if (attackRange.lShape) directions.push('L-Shape (Knight)');
    
    return directions.length > 0 
      ? directions.join(', ')
      : 'No attack range';
  };

  return (
    <IndicatorContainer size={size}>
      <SVGContainer viewBox={`0 0 ${size} ${size}`}>
        {/* Background */}
        <rect 
          x="0" 
          y="0" 
          width={size} 
          height={size} 
          fill="var(--accent-bg)" 
          rx="4"
        />

        {/* Grid lines for visual reference */}
        <line 
          x1={center} 
          y1="0" 
          x2={center} 
          y2={size} 
          stroke="var(--border)" 
          strokeWidth="0.5" 
          opacity="0.3"
        />
        <line 
          x1="0" 
          y1={center} 
          x2={size} 
          y2={center} 
          stroke="var(--border)" 
          strokeWidth="0.5" 
          opacity="0.3"
        />

        {/* Horizontal line */}
        {attackRange.horizontal && (
          <line
            x1={center - lineLength}
            y1={center}
            x2={center + lineLength}
            y2={center}
            stroke="var(--gold)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Vertical line */}
        {attackRange.vertical && (
          <line
            x1={center}
            y1={center - lineLength}
            x2={center}
            y2={center + lineLength}
            stroke="var(--gold)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Diagonal lines */}
        {attackRange.diagonal && (
          <>
            {/* Top-left to bottom-right */}
            <line
              x1={center - lineLength * 0.7}
              y1={center - lineLength * 0.7}
              x2={center + lineLength * 0.7}
              y2={center + lineLength * 0.7}
              stroke="var(--gold)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Top-right to bottom-left */}
            <line
              x1={center + lineLength * 0.7}
              y1={center - lineLength * 0.7}
              x2={center - lineLength * 0.7}
              y2={center + lineLength * 0.7}
              stroke="var(--gold)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}

        {/* L-Shape dots (knight positions) */}
        {attackRange.lShape && knightPositions.map((pos, index) => (
          <circle
            key={index}
            cx={pos.x}
            cy={pos.y}
            r={lShapeDotRadius}
            fill="var(--gold)"
          />
        ))}

        {/* Center square representing the piece */}
        <rect
          x={center - centerSquareSize / 2}
          y={center - centerSquareSize / 2}
          width={centerSquareSize}
          height={centerSquareSize}
          fill="var(--primary-text)"
          stroke="var(--gold)"
          strokeWidth="1"
          rx="1"
        />
      </SVGContainer>

      {/* Tooltip */}
      <div className="tooltip">{getTooltipText()}</div>
    </IndicatorContainer>
  );
};

