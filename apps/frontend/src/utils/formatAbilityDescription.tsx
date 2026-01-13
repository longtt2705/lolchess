import React from 'react';

interface ChessStats {
    ap?: number;
    ad?: number;
    maxHp?: number;
    sunder?: number;
    physicalResistance?: number;
    magicResistance?: number;
    [key: string]: any;
}

// Color definitions for stat types
const STAT_COLORS = {
    ap: '#00CED1',  // Cyan for AP
    ad: '#FF8C00',  // Orange for AD
    hp: '#22c55e',  // Green for HP
    armor: '#FFA500',  // Orange for Physical Resistance
    mr: '#8A2BE2',  // Blue-violet for Magic Resistance
    sunder: '#DC143C',  // Crimson for Sunder
    speed: '#FFD700',  // Gold for speed
    default: '#FFFFFF',
} as const;

// Icon paths for stat types
const STAT_ICONS = {
    ap: '/icons/AP.svg',
    ad: '/icons/AD.svg',
    hp: '/icons/icon-hp.svg',
    armor: '/icons/Armor.svg',
    mr: '/icons/MagicResist.svg',
    sunder: '/icons/AS.svg',
    speed: '/icons/speed.png',
} as const;

interface ScalingPart {
    type: 'base' | 'ap' | 'ad' | 'hp' | 'bonus_ad' | 'armor' | 'mr' | 'sunder';
    value: number; // The percentage or flat value
    isPercentage: boolean;
}

interface ParsedExpression {
    original: string;
    parts: ScalingPart[];
}

/**
 * Parse a scaling expression like "(10 + 25% AP)" or "(10 + 25% of AP)"
 * Returns the parts broken down for calculation
 */
function parseScalingExpression(expr: string): ParsedExpression | null {
    // Remove outer parentheses if present
    const cleaned = expr.replace(/^\(|\)$/g, '').trim();

    const parts: ScalingPart[] = [];

    // Split by + or - while keeping the operator
    const segments = cleaned.split(/(?=[+-])/);

    for (const segment of segments) {
        const trimmed = segment.trim();
        if (!trimmed) continue;

        // Check for percentage-based scaling patterns
        // Pattern: "25% of AP" or "25% AP" or "25%AP"
        const apMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*(?:of\s+)?AP/i);
        const adMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*(?:of\s+)?(?:bonus\s+)?AD/i);
        const bonusAdMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*(?:of\s+)?bonus\s+AD/i);
        const hpMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*(?:of\s+)?(?:max\s+)?(?:HP|health)/i);
        const armorMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*(?:of\s+)?(?:Physical\s+Resistance|Armor)/i);
        const mrMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*(?:of\s+)?(?:Magic\s+Resistance|MR)/i);
        const sunderMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*(?:of\s+)?Sunder/i);

        // Check for "100% AD" style (full stat scaling)
        const fullAdMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*AD(?!\s*\w)/i);
        const fullApMatch = trimmed.match(/([+-]?\s*[\d.]+)\s*%\s*AP(?!\s*\w)/i);

        if (bonusAdMatch) {
            parts.push({
                type: 'bonus_ad',
                value: parseFloat(bonusAdMatch[1].replace(/\s/g, '')),
                isPercentage: true,
            });
        } else if (adMatch || fullAdMatch) {
            const match = adMatch || fullAdMatch;
            parts.push({
                type: 'ad',
                value: parseFloat(match![1].replace(/\s/g, '')),
                isPercentage: true,
            });
        } else if (apMatch || fullApMatch) {
            const match = apMatch || fullApMatch;
            parts.push({
                type: 'ap',
                value: parseFloat(match![1].replace(/\s/g, '')),
                isPercentage: true,
            });
        } else if (hpMatch) {
            parts.push({
                type: 'hp',
                value: parseFloat(hpMatch[1].replace(/\s/g, '')),
                isPercentage: true,
            });
        } else if (armorMatch) {
            parts.push({
                type: 'armor',
                value: parseFloat(armorMatch[1].replace(/\s/g, '')),
                isPercentage: true,
            });
        } else if (mrMatch) {
            parts.push({
                type: 'mr',
                value: parseFloat(mrMatch[1].replace(/\s/g, '')),
                isPercentage: true,
            });
        } else if (sunderMatch) {
            parts.push({
                type: 'sunder',
                value: parseFloat(sunderMatch[1].replace(/\s/g, '')),
                isPercentage: true,
            });
        } else {
            // Plain number (base damage)
            const numMatch = trimmed.match(/([+-]?\s*[\d.]+)/);
            if (numMatch) {
                parts.push({
                    type: 'base',
                    value: parseFloat(numMatch[1].replace(/\s/g, '')),
                    isPercentage: false,
                });
            }
        }
    }

    if (parts.length === 0) return null;

    return {
        original: expr,
        parts,
    };
}

/**
 * Calculate the total value from a parsed expression using current stats
 */
function calculateValue(parsed: ParsedExpression, stats: ChessStats): number {
    let total = 0;

    for (const part of parsed.parts) {
        switch (part.type) {
            case 'base':
                total += part.value;
                break;
            case 'ap':
                total += (part.value / 100) * (stats.ap || 0);
                break;
            case 'ad':
                total += (part.value / 100) * (stats.ad || 0);
                break;
            case 'bonus_ad':
                // Bonus AD would need baseAd to calculate, for now treat same as AD
                total += (part.value / 100) * (stats.ad || 0);
                break;
            case 'hp':
                total += (part.value / 100) * (stats.maxHp || 0);
                break;
            case 'armor':
                total += (part.value / 100) * (stats.physicalResistance || 0);
                break;
            case 'mr':
                total += (part.value / 100) * (stats.magicResistance || 0);
                break;
            case 'sunder':
                total += (part.value / 100) * (stats.sunder || 0);
                break;
        }
    }

    return Math.floor(total);
}

/**
 * Render the formula breakdown with colors and icons
 */
function renderFormula(parsed: ParsedExpression, stats: ChessStats): React.ReactNode[] {
    const elements: React.ReactNode[] = [];

    parsed.parts.forEach((part, index) => {
        const prefix = index === 0 ? '' : (part.value >= 0 ? ' +' : ' ');
        const absValue = Math.abs(part.value);

        switch (part.type) {
            case 'base':
                elements.push(
                    <span key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {prefix}{absValue}
                    </span>
                );
                break;
            case 'ap':
                elements.push(
                    <span key={index} style={{ color: STAT_COLORS.ap, fontWeight: 600 }}>
                        {prefix}{absValue}%
                        <img
                            src={STAT_ICONS.ap}
                            alt="AP"
                            style={{
                                width: '12px',
                                height: '12px',
                                verticalAlign: 'middle',
                                marginLeft: '2px',
                                filter: 'brightness(0) saturate(100%) invert(78%) sepia(47%) saturate(1000%) hue-rotate(130deg) brightness(95%) contrast(95%)'
                            }}
                        />
                    </span>
                );
                break;
            case 'ad':
            case 'bonus_ad':
                elements.push(
                    <span key={index} style={{ color: STAT_COLORS.ad, fontWeight: 600 }}>
                        {prefix}{absValue}%
                        <img
                            src={STAT_ICONS.ad}
                            alt="AD"
                            style={{
                                width: '12px',
                                height: '12px',
                                verticalAlign: 'middle',
                                marginLeft: '2px',
                                filter: 'brightness(0) saturate(100%) invert(55%) sepia(95%) saturate(1000%) hue-rotate(10deg) brightness(100%) contrast(100%)'
                            }}
                        />
                    </span>
                );
                break;
            case 'hp':
                elements.push(
                    <span key={index} style={{ color: STAT_COLORS.hp, fontWeight: 600 }}>
                        {prefix}{absValue}%
                        <img
                            src={STAT_ICONS.hp}
                            alt="HP"
                            style={{
                                width: '12px',
                                height: '12px',
                                verticalAlign: 'middle',
                                marginLeft: '2px'
                            }}
                        />
                    </span>
                );
                break;
            case 'armor':
                elements.push(
                    <span key={index} style={{ color: STAT_COLORS.armor, fontWeight: 600 }}>
                        {prefix}{absValue}%
                        <img
                            src={STAT_ICONS.armor}
                            alt="Armor"
                            style={{
                                width: '12px',
                                height: '12px',
                                verticalAlign: 'middle',
                                marginLeft: '2px'
                            }}
                        />
                    </span>
                );
                break;
            case 'mr':
                elements.push(
                    <span key={index} style={{ color: STAT_COLORS.mr, fontWeight: 600 }}>
                        {prefix}{absValue}%
                        <img
                            src={STAT_ICONS.mr}
                            alt="MR"
                            style={{
                                width: '12px',
                                height: '12px',
                                verticalAlign: 'middle',
                                marginLeft: '2px'
                            }}
                        />
                    </span>
                );
                break;
            case 'sunder':
                elements.push(
                    <span key={index} style={{ color: STAT_COLORS.sunder, fontWeight: 600 }}>
                        {prefix}{absValue}%
                        <img
                            src={STAT_ICONS.sunder}
                            alt="Sunder"
                            style={{
                                width: '12px',
                                height: '12px',
                                verticalAlign: 'middle',
                                marginLeft: '2px'
                            }}
                        />
                    </span>
                );
                break;
        }
    });

    return elements;
}

/**
 * Replace "Move Speed" text with the speed icon
 */
function replaceMoveSpeedWithIcon(text: string): React.ReactNode {
    const moveSpeedPattern = /Move Speed/gi;
    const textParts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIndex = 0;

    while ((match = moveSpeedPattern.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            textParts.push(text.slice(lastIndex, match.index));
        }

        // Add speed icon
        textParts.push(
            <img
                key={`speed-${keyIndex++}`}
                src={STAT_ICONS.speed}
                alt="Speed"
                style={{
                    width: '14px',
                    height: '14px',
                    verticalAlign: 'middle',
                    margin: '0 2px'
                }}
            />
        );

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        textParts.push(text.slice(lastIndex));
    }

    // If no matches found, return original text
    if (textParts.length === 0) {
        return text;
    }

    return <>{textParts}</>;
}

/**
 * Main function to format ability descriptions with calculated values
 * Replaces expressions like (10 + 25% AP) with "35 = (10 +25%🔮)"
 */
export function formatAbilityDescription(
    description: string,
    stats: ChessStats
): React.ReactNode {
    if (!description) return null;

    // Regex to find scaling expressions in parentheses
    // Matches patterns like: (10 + 25% AP), (10 + 25% of AP), (15 + 10% AP + 20% AD)
    const scalingPattern = /\([\d\s+\-*/%]+(?:of\s+)?(?:AP|AD|bonus\s+AD|max\s+HP|HP|health|Physical\s+Resistance|Armor|Magic\s+Resistance|MR|Sunder)(?:[\s+\-*/%\d]+(?:of\s+)?(?:AP|AD|bonus\s+AD|max\s+HP|HP|health|Physical\s+Resistance|Armor|Magic\s+Resistance|MR|Sunder))*\)/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIndex = 0;

    while ((match = scalingPattern.exec(description)) !== null) {
        // Add text before the match (with Move Speed replacement)
        if (match.index > lastIndex) {
            const textBeforeMatch = description.slice(lastIndex, match.index);
            parts.push(
                <span key={keyIndex++}>
                    {replaceMoveSpeedWithIcon(textBeforeMatch)}
                </span>
            );
        }

        // Parse and format the scaling expression
        const parsed = parseScalingExpression(match[0]);
        if (parsed) {
            const calculatedValue = calculateValue(parsed, stats);
            const formula = renderFormula(parsed, stats);

            parts.push(
                <span
                    key={keyIndex++}
                    style={{
                        display: 'inline',
                        whiteSpace: 'nowrap'
                    }}
                    title={`Calculated from: ${match[0]}`}
                >
                    <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                        {calculatedValue}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9em' }}>
                        {' = ('}
                    </span>
                    {formula}
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9em' }}>
                        {')'}
                    </span>
                </span>
            );
        } else {
            // Couldn't parse, keep original
            parts.push(<span key={keyIndex++}>{match[0]}</span>);
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match (with Move Speed replacement)
    if (lastIndex < description.length) {
        const remainingText = description.slice(lastIndex);
        parts.push(
            <span key={keyIndex++}>
                {replaceMoveSpeedWithIcon(remainingText)}
            </span>
        );
    }

    // If no matches found, return plain description with Move Speed replacement
    if (parts.length === 0) {
        return replaceMoveSpeedWithIcon(description);
    }

    return <>{parts}</>;
}
