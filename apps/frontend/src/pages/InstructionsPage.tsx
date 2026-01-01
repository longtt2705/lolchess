import React, { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookOpen,
    Target,
    Grid3x3,
    Crown,
    Sword,
    Trophy,
    Coins,
    Shield,
    Zap,
    ChevronDown,
    ChevronUp,
    Info,
    Users,
    Gamepad2
} from 'lucide-react'

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
  padding: 40px 20px;
`

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const Header = styled(motion.div)`
  text-align: center;
  margin-bottom: 60px;
  
  h1 {
    font-size: 3.5rem;
    background: linear-gradient(135deg, var(--gold) 0%, var(--hover) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  
  p {
    font-size: 1.2rem;
    color: var(--secondary-text);
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }
`

const SectionNav = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
`

const NavButton = styled(motion.button) <{ active?: boolean }>`
  background: ${props => props.active
        ? 'linear-gradient(135deg, var(--gold) 0%, #b8860b 100%)'
        : 'var(--secondary-bg)'};
  color: ${props => props.active ? 'var(--primary-bg)' : 'var(--primary-text)'};
  border: 2px solid ${props => props.active ? 'var(--gold)' : 'var(--border)'};
  border-radius: 8px;
  padding: 12px 16px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
    border-color: var(--gold);
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`

const Section = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`

const SectionTitle = styled.h2`
  color: var(--gold);
  font-size: 2rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  svg {
    width: 32px;
    height: 32px;
  }
`

const SectionContent = styled.div`
  color: var(--primary-text);
  line-height: 1.8;
  
  h3 {
    color: var(--gold);
    font-size: 1.4rem;
    margin-top: 24px;
    margin-bottom: 12px;
  }
  
  h4 {
    color: var(--hover);
    font-size: 1.2rem;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  
  p {
    margin-bottom: 12px;
    color: var(--primary-text);
  }
  
  ul, ol {
    margin-left: 24px;
    margin-bottom: 16px;
  }
  
  li {
    margin-bottom: 8px;
    color: var(--primary-text);
  }
  
  strong {
    color: var(--gold);
    font-weight: 600;
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
`

const StatCard = styled.div`
  background: var(--accent-bg);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  
  .label {
    color: var(--secondary-text);
    font-size: 0.9rem;
    margin-bottom: 4px;
  }
  
  .value {
    color: var(--gold);
    font-size: 1.3rem;
    font-weight: bold;
  }
`

const CollapsibleSection = styled.div`
  margin: 20px 0;
`

const CollapsibleHeader = styled(motion.button)`
  width: 100%;
  background: var(--accent-bg);
  border: 2px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px;
  color: var(--primary-text);
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--gold);
    box-shadow: 0 0 12px rgba(200, 155, 60, 0.2);
  }
  
  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }
`

const CollapsibleContent = styled(motion.div)`
  overflow: hidden;
  background: var(--primary-bg);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 20px;
`

const HighlightBox = styled.div<{ variant?: 'info' | 'warning' | 'success' }>`
  background: ${props => {
        switch (props.variant) {
            case 'warning': return 'rgba(200, 170, 110, 0.1)';
            case 'success': return 'rgba(15, 32, 39, 0.3)';
            default: return 'rgba(5, 150, 170, 0.1)';
        }
    }};
  border-left: 4px solid ${props => {
        switch (props.variant) {
            case 'warning': return 'var(--gold)';
            case 'success': return 'var(--green)';
            default: return 'var(--hover)';
        }
    }};
  padding: 16px 20px;
  border-radius: 4px;
  margin: 16px 0;
  
  strong {
    color: var(--gold);
  }
  
  p {
    margin-bottom: 8px;
    &:last-child {
      margin-bottom: 0;
    }
  }
`

const InstructionsPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('overview')
    const [expandedPieces, setExpandedPieces] = useState<Set<string>>(new Set())

    const togglePiece = (piece: string) => {
        setExpandedPieces(prev => {
            const newSet = new Set(prev)
            if (newSet.has(piece)) {
                newSet.delete(piece)
            } else {
                newSet.add(piece)
            }
            return newSet
        })
    }

    const sections = [
        { id: 'overview', label: 'Overview', icon: <BookOpen /> },
        { id: 'setup', label: 'Setup', icon: <Grid3x3 /> },
        { id: 'pieces', label: 'Pieces', icon: <Crown /> },
        { id: 'gameplay', label: 'Gameplay', icon: <Gamepad2 /> },
        { id: 'monsters', label: 'Monsters', icon: <Trophy /> },
        { id: 'shop', label: 'Shop', icon: <Coins /> }
    ]

    const pieceTypes = [
        {
            id: 'poro',
            name: 'Poro (King)',
            icon: '👑',
            stats: {
                'HP': '100',
                'Physical Res': '50',
                'Magic Res': '50',
                'Movement': '1 square (any direction)',
                'Attack': 'Cannot attack',
                'Gold Value': 'N/A (Game ends)'
            },
            description: 'The objective piece. If your Poro is slain, you lose the game. Can move 1 square in any direction but cannot attack. Immune to stun effects. Benefits from Minion Synergy (+15 AD/Armor/MR per adjacent minion).'
        },
        {
            id: 'champion',
            name: 'Champion (Queen, Bishops, Knights)',
            icon: '⚔️',
            stats: {
                'HP': '80 (varies)',
                'AD': '50 (varies)',
                'AP': '0 (varies)',
                'Speed': '1-2 (varies)',
                'Attack Range': '2 (varies)',
                'Gold Value': '50'
            },
            description: 'Powerful pieces with unique abilities. Can equip up to 3 items. Champions at Knight positions (b1/b8, g1/g8) can make an L-shaped knight move on their FIRST move only, jumping over pieces.'
        },
        {
            id: 'siege',
            name: 'Siege Minion (Rook)',
            icon: '🗼',
            stats: {
                'HP': '200',
                'AD': '40',
                'Physical Res': '25',
                'Magic Res': '10',
                'Speed': '4',
                'Attack Range': '8 (H/V only)',
                'Gold Value': '40'
            },
            description: 'Strong defensive unit with long-range attacks along horizontal and vertical lines. Can castle with the Poro if neither has moved.'
        },
        {
            id: 'melee',
            name: 'Melee Minion (Pawn)',
            icon: '⚔',
            stats: {
                'HP': '100',
                'AD': '25',
                'Physical Res': '20',
                'Magic Res': '5',
                'Movement': '1 forward (2 on first move)',
                'Attack Range': '1',
                'Gold Value': '20'
            },
            description: 'Basic unit that promotes to Super Minion upon reaching enemy back rank. Gets +1 speed on first move. Benefits from Minion Synergy (+15 AD/Armor/MR per adjacent minion).'
        },
        {
            id: 'caster',
            name: 'Caster Minion (Pawn)',
            icon: '🏹',
            stats: {
                'HP': '50',
                'AD': '35',
                'Physical Res': '15',
                'Magic Res': '5',
                'Movement': '1 forward (2 on first move)',
                'Attack Range': '2',
                'Gold Value': '25'
            },
            description: 'Ranged unit with lower health but higher damage and attack range than Melee Minions. Gets +1 speed on first move. Benefits from Minion Synergy (+15 AD/Armor/MR per adjacent minion).'
        },
        {
            id: 'super',
            name: 'Super Minion (Promoted Pawn)',
            icon: '🛡️',
            stats: {
                'HP': '300',
                'AD': '100',
                'AP': '100',
                'Speed': '5 (any direction)',
                'Physical Res': '50',
                'Magic Res': '50',
                'Gold Value': '50'
            },
            description: 'Enhanced version of Melee Minion created upon promotion. Can move in any of 8 directions (no longer restricted to forward). Benefits from Minion Synergy.'
        }
    ]

    return (
        <PageContainer>
            <ContentWrapper>
                <Header
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1>
                        <BookOpen size={48} />
                        League of Legends Chess
                    </h1>
                    <p>
                        Master the rules of this strategic 1v1 chess variant where League of Legends champions
                        battle for supremacy. Learn the mechanics and dominate the board!
                    </p>
                </Header>

                <SectionNav>
                    {sections.map((section, index) => (
                        <NavButton
                            key={section.id}
                            active={activeSection === section.id}
                            onClick={() => setActiveSection(section.id)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {section.icon}
                            {section.label}
                        </NavButton>
                    ))}
                </SectionNav>

                <AnimatePresence mode="wait">
                    {activeSection === 'overview' && (
                        <Section
                            key="overview"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SectionTitle>
                                <Target />
                                Game Objective
                            </SectionTitle>
                            <SectionContent>
                                <HighlightBox variant="info">
                                    <strong>Primary Goal:</strong> Defeat your opponent's Poro to win the game!
                                </HighlightBox>

                                <p>
                                    League of Legends Chess is a strategic 1v1 board game that combines classic chess mechanics
                                    with League of Legends champions and gameplay elements. Unlike traditional chess where
                                    checkmate is the goal, your objective is to <strong>slay the opponent's Poro</strong> piece.
                                </p>

                                <h3>Key Features</h3>
                                <ul>
                                    <li><strong>Ban & Pick Phase:</strong> Select your 5 champions strategically</li>
                                    <li><strong>Unique Abilities:</strong> Each champion has a special ability</li>
                                    <li><strong>Item Shop:</strong> Purchase basic items that auto-combine into powerful items (TFT-style)</li>
                                    <li><strong>Neutral Objectives:</strong> Baron Nashor and Drake provide powerful buffs</li>
                                    <li><strong>Gold Economy:</strong> Earn gold by slaying pieces, objectives, and passive income</li>
                                    <li><strong>Minion Synergy:</strong> Minions and Poro gain stats from adjacent allies</li>
                                    <li><strong>Knight's First Move:</strong> Champions at knight positions can jump on first move</li>
                                </ul>

                                <h3>Winning Conditions</h3>
                                <ul>
                                    <li>Slay the opponent's Poro</li>
                                    <li>Opponent resigns</li>
                                </ul>

                                <h3>Draw Conditions</h3>
                                <ul>
                                    <li><strong>Stalemate:</strong> Player cannot make any legal move but Poro is not under attack</li>
                                    <li><strong>Agreement:</strong> Both players agree to a draw</li>
                                    <li><strong>Repetition:</strong> Same board position occurs three times with same player to move</li>
                                </ul>
                            </SectionContent>
                        </Section>
                    )}

                    {activeSection === 'setup' && (
                        <Section
                            key="setup"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SectionTitle>
                                <Grid3x3 />
                                Board Setup & Ban/Pick Phase
                            </SectionTitle>
                            <SectionContent>
                                <h3>The Board</h3>
                                <p>
                                    The game is played on a <strong>10x10 grid</strong>. The standard 8x8 chessboard
                                    (files 'a' through 'h' and ranks 1 through 8) is used for piece placement, with
                                    two additional files:
                                </p>
                                <ul>
                                    <li><strong>File 'z':</strong> Left side - Contains Baron Nashor pit (z5)</li>
                                    <li><strong>File 'i':</strong> Right side - Contains Drake pit (i4)</li>
                                </ul>

                                <HighlightBox variant="warning">
                                    <strong>Special Squares:</strong>
                                    <ul>
                                        <li><strong>z5:</strong> Baron Nashor spawns here (turn 10)</li>
                                        <li><strong>i4:</strong> Drake spawns here (turn 5)</li>
                                    </ul>
                                </HighlightBox>

                                <h3>Sides</h3>
                                <ul>
                                    <li><strong>Blue Side:</strong> Starts on ranks 1 & 2 (moves first)</li>
                                    <li><strong>Red Side:</strong> Starts on ranks 7 & 8</li>
                                </ul>

                                <h3>Ban & Pick Phase</h3>
                                <p>Before the game begins, players select their champions through a strategic draft:</p>

                                <h4>1. Ban Phase</h4>
                                <p>
                                    Starting with Blue Side, players alternate banning champions until
                                    <strong> 4 champions are banned</strong> (2 per player). Banned champions
                                    cannot be picked by either player.
                                </p>

                                <h4>2. Pick Phase</h4>
                                <p>
                                    Starting with Blue Side, players pick champions in a <strong>snake draft format</strong>:
                                </p>
                                <ul>
                                    <li>Blue → Red → Red → Blue → Blue → Red → Red → Blue → Blue → Red</li>
                                    <li>Each player selects <strong>5 champions</strong> total</li>
                                    <li>Champions replace the traditional Knights, Bishops, and Queen</li>
                                </ul>

                                <h3>Initial Piece Placement</h3>

                                <h4>Rank 1 (Blue) / Rank 8 (Red):</h4>
                                <ul>
                                    <li><strong>a1/a8 & h1/h8:</strong> Siege Minion (Rook position)</li>
                                    <li><strong>b1/b8 & g1/g8:</strong> Champion 1 & 2 (Knight positions)</li>
                                    <li><strong>c1/c8 & f1/f8:</strong> Champion 3 & 4 (Bishop positions)</li>
                                    <li><strong>d1/d8:</strong> Champion 5 (Queen position)</li>
                                    <li><strong>e1/e8:</strong> Poro (King position)</li>
                                </ul>

                                <h4>Rank 2 (Blue) / Rank 7 (Red):</h4>
                                <ul>
                                    <li><strong>b2→g2 / b7→g7:</strong> 6 Melee Minions</li>
                                    <li><strong>a2/a7 & h2/h7:</strong> 2 Caster Minions</li>
                                </ul>
                            </SectionContent>
                        </Section>
                    )}

                    {activeSection === 'pieces' && (
                        <Section
                            key="pieces"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SectionTitle>
                                <Crown />
                                Pieces & Characteristics
                            </SectionTitle>
                            <SectionContent>
                                <HighlightBox variant="info">
                                    <strong>Universal Attributes:</strong> All pieces have HP, AD, AP, Physical Resistance,
                                    Magic Resistance, Speed, Attack Range, and Gold Value.
                                </HighlightBox>

                                <h3>Core Stats</h3>
                                <ul>
                                    <li><strong>HP (Health Points):</strong> The amount of damage a piece can sustain before being slain.</li>
                                    <li><strong>AD (Attack Damage):</strong> Damage dealt by basic attacks, reduced by Physical Resistance.</li>
                                    <li><strong>AP (Ability Power):</strong> Primarily used to scale the power of champion special abilities.</li>
                                    <li><strong>Physical Resistance:</strong> Reduces incoming damage from AD attacks.</li>
                                    <li><strong>Magic Resistance:</strong> Reduces incoming damage from AP attacks.</li>
                                    <li><strong>Speed:</strong> Maximum number of squares a piece can move in a single direction per turn. Default is 1.</li>
                                    <li><strong>Attack Range:</strong> Maximum number of squares away a piece can attack in a single direction.</li>
                                    <li><strong>Gold Value:</strong> Gold awarded to opponent upon slaying this piece.</li>
                                    <li><strong>HP Regen:</strong> HP regenerated at the start of each turn. Default is 0.</li>
                                </ul>

                                <h3>Advanced Stats</h3>
                                <ul>
                                    <li><strong>Sunder:</strong> Flat armor penetration. Reduces the target's Physical Resistance by this amount when calculating damage (cannot reduce below 0).</li>
                                    <li><strong>Critical Chance:</strong> Percentage chance (0-100%) for basic attacks to deal critical damage.</li>
                                    <li><strong>Critical Damage:</strong> The damage multiplier for critical strikes. Default is 150% (dealing 1.5× damage).</li>
                                    <li><strong>Lifesteal:</strong> Percentage of AD damage dealt that is converted to HP healing for the attacker.</li>
                                    <li><strong>Cooldown Reduction:</strong> Reduces the cooldown of champion abilities. Each point reduces cooldown by 1 turn.</li>
                                    <li><strong>Damage Amplification:</strong> Percentage increase to all damage dealt (both physical and magical). Multiplicative with other damage increases.</li>
                                </ul>

                                <h3>Piece Types</h3>
                                <p>Click on each piece type to view detailed stats and characteristics:</p>

                                {pieceTypes.map((piece, index) => (
                                    <CollapsibleSection key={piece.id}>
                                        <CollapsibleHeader
                                            onClick={() => togglePiece(piece.id)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <div className="header-content">
                                                <span style={{ fontSize: '1.5rem' }}>{piece.icon}</span>
                                                <span>{piece.name}</span>
                                            </div>
                                            {expandedPieces.has(piece.id) ? <ChevronUp /> : <ChevronDown />}
                                        </CollapsibleHeader>

                                        <AnimatePresence>
                                            {expandedPieces.has(piece.id) && (
                                                <CollapsibleContent
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <p style={{ marginBottom: '16px' }}>{piece.description}</p>
                                                    <StatsGrid>
                                                        {Object.entries(piece.stats).map(([key, value]) => (
                                                            <StatCard key={key}>
                                                                <div className="label">{key}</div>
                                                                <div className="value">{value}</div>
                                                            </StatCard>
                                                        ))}
                                                    </StatsGrid>
                                                </CollapsibleContent>
                                            )}
                                        </AnimatePresence>
                                    </CollapsibleSection>
                                ))}

                                <h3 style={{ marginTop: '32px' }}>Special Mechanics</h3>

                                <h4>Minion Synergy</h4>
                                <HighlightBox variant="success">
                                    <p><strong>Minions, Poro, Sand Soldiers, and Super Minions</strong> gain stats for each adjacent ally from this group:</p>
                                    <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                                        <li><strong>+15 Attack Damage (AD)</strong></li>
                                        <li><strong>+15 Physical Resistance</strong></li>
                                        <li><strong>+15 Magic Resistance</strong></li>
                                    </ul>
                                </HighlightBox>
                                <p>This encourages maintaining formation and protecting your Poro with surrounding minions!</p>

                                <h4>Knight's First Move</h4>
                                <p>
                                    Champions starting at <strong>Knight positions (b1/b8 and g1/g8)</strong> can make
                                    an L-shaped knight move (2 squares + 1 perpendicular) as their <strong>first move only</strong>.
                                    This move can jump over pieces. After their first move, they follow standard movement rules.
                                </p>

                                <h4>Minion First Move Bonus</h4>
                                <p>
                                    <strong>Melee Minions</strong> and <strong>Caster Minions</strong> gain <strong>+1 speed</strong> on
                                    their first move, allowing them to move up to 2 squares forward instead of 1.
                                </p>

                                <h4>Poro Stun Immunity</h4>
                                <p>
                                    The <strong>Poro is immune to all stun effects</strong>. This prevents situations where
                                    all pieces are stunned and no moves can be made.
                                </p>

                                <h4>Champion Abilities</h4>
                                <p>
                                    Each champion has a <strong>unique special ability</strong> that can be activated
                                    instead of moving or attacking. Abilities have cooldowns and can turn the tide of battle.
                                </p>

                                <h4>Items</h4>
                                <p>
                                    Champions can equip up to <strong>3 items</strong> purchased from the shop.
                                    Basic items automatically combine into powerful combined items (TFT-style crafting).
                                </p>

                                <h4>Promotion</h4>
                                <p>
                                    When a <strong>Melee Minion</strong> reaches the opponent's back rank
                                    (rank 8 for Blue, rank 1 for Red), it immediately promotes to a
                                    <strong> Super Minion</strong> with significantly enhanced stats and unrestricted movement.
                                </p>
                            </SectionContent>
                        </Section>
                    )}

                    {activeSection === 'gameplay' && (
                        <Section
                            key="gameplay"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SectionTitle>
                                <Gamepad2 />
                                Gameplay & Turn Structure
                            </SectionTitle>
                            <SectionContent>
                                <HighlightBox variant="info">
                                    <strong>Blue Side always moves first.</strong> Each turn has two phases: optional item purchase,
                                    then required board action.
                                </HighlightBox>

                                <h3>Turn Structure</h3>

                                <h4>Phase 1: Buy Item (Optional)</h4>
                                <p>
                                    At the <strong>start of your turn</strong>, you may purchase <strong>ONE item</strong> from the shop
                                    for a champion. Once you buy an item or perform any board action, you cannot buy more items until your next turn.
                                </p>

                                <h4>Phase 2: Board Action (Required)</h4>
                                <p>You must perform <strong>one</strong> of the following actions with <strong>one</strong> of your pieces:</p>

                                <h4>1. Move</h4>
                                <p>
                                    Move a piece to a valid empty square according to its movement rules.
                                    Pieces cannot move through other pieces.
                                </p>

                                <h4>2. Castle</h4>
                                <p>
                                    Special move with the Poro and a Siege Minion if:
                                </p>
                                <ul>
                                    <li>The Poro has not moved before</li>
                                    <li>The Siege Minion has not moved before</li>
                                    <li>They are on the same rank with no pieces between them</li>
                                    <li>The Poro moves 2 squares toward the Siege Minion</li>
                                    <li>The Siege Minion moves to the other side of the Poro</li>
                                </ul>
                                <HighlightBox variant="success">
                                    <strong>Castling Shield Bonus:</strong> Upon castling, the Poro gains a <strong>permanent shield
                                    equal to 25% of its max HP</strong>!
                                </HighlightBox>

                                <h4>3. Attack</h4>
                                <p>
                                    Use a piece to attack an opponent's piece within its attack range.
                                    Line-of-sight attacks cannot target pieces behind blockers.
                                </p>

                                <h4>4. Use Ability</h4>
                                <p>
                                    Champions can activate their special ability instead of moving or attacking
                                    (subject to cooldown restrictions).
                                </p>

                                <h3>Combat System</h3>

                                <h4>Damage Calculation</h4>
                                <p>When a piece attacks another, damage is calculated in the following order:</p>
                                <ol>
                                    <li><strong>Base Damage:</strong> Determined (AD for basic attacks, varies for abilities)</li>
                                    <li><strong>Critical Strike:</strong> Rolled if applicable based on Critical Chance</li>
                                    <li><strong>Damage Amplification:</strong> Applied if any (multiplicative)</li>
                                    <li><strong>Resistance:</strong> Physical Resistance for AD damage, Magic Resistance for AP damage (reduced by Sunder if applicable)</li>
                                    <li><strong>Final Damage:</strong> Subtracted from defender's HP</li>
                                </ol>

                                <HighlightBox variant="info">
                                    <p><strong>AD attacks:</strong> Reduced by Physical Resistance</p>
                                    <p><strong>AP attacks:</strong> Reduced by Magic Resistance</p>
                                    <p><strong>Sunder:</strong> Reduces Physical Resistance before damage calculation</p>
                                    <p><strong>Lifesteal:</strong> Heals for a percentage of AD damage dealt (after resistances)</p>
                                </HighlightBox>

                                <h4>Critical Strikes</h4>
                                <HighlightBox variant="warning">
                                    <p><strong>Critical Strike Chance:</strong> Percentage chance to land a critical hit</p>
                                    <p><strong>Critical Damage:</strong> Deals 125% damage by default (modifiable)</p>
                                </HighlightBox>

                                <h4>Slaying Pieces</h4>
                                <p>
                                    When a piece's HP drops to 0 or below, it is slain and removed from the board.
                                    The attacking player gains <strong>Gold</strong> equal to the slain piece's Gold Value.
                                    Defender does not counter-attack (unless ability-based).
                                </p>

                                <h3>Status Effects (Debuffs)</h3>
                                <p>Status effects can be applied by champion abilities and items. Multiple instances of the same debuff do not stack unless specified.</p>

                                <ul>
                                    <li><strong>Burn:</strong> Deals magic damage at the start of the affected piece's owner's turn. Duration and damage vary by source.</li>
                                    <li><strong>Wound:</strong> Reduces healing received by a percentage. Affects HP regeneration and lifesteal.</li>
                                    <li><strong>Slow:</strong> Reduces the affected piece's Speed by a fixed amount or percentage. Cannot reduce Speed below 1.</li>
                                    <li><strong>Venom:</strong> Reduces the shield of the affected piece by 50%.</li>
                                    <li><strong>Stun:</strong> The affected piece cannot move, attack, or use abilities for the duration.</li>
                                    <li><strong>Root:</strong> The affected piece cannot move but can still attack and use abilities.</li>
                                </ul>

                                <h3>Line of Sight & Blocking</h3>
                                <p>
                                    Most attacks and movement are blocked by pieces in the path. Champions and
                                    Siege Minions cannot attack through other pieces - they stop at the first
                                    piece they encounter.
                                </p>
                            </SectionContent>
                        </Section>
                    )}

                    {activeSection === 'monsters' && (
                        <Section
                            key="monsters"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SectionTitle>
                                <Trophy />
                                Neutral Monsters: Baron & Drake
                            </SectionTitle>
                            <SectionContent>
                                <p>
                                    Neutral monsters provide powerful team-wide buffs when slain. They can be
                                    attacked by either player and do not move or attack on their own.
                                </p>

                                <h3>Drake</h3>
                                <HighlightBox variant="success">
                                    <p><strong>Spawns:</strong> Square i4 at the end of Red's 5th turn</p>
                                    <p><strong>HP:</strong> 250</p>
                                </HighlightBox>

                                <h4>Drake Kill Rewards</h4>
                                <StatsGrid>
                                    <StatCard>
                                        <div className="label">Gold Reward</div>
                                        <div className="value">+50</div>
                                    </StatCard>
                                    <StatCard>
                                        <div className="label">Drake Soul Buff</div>
                                        <div className="value">+20 AD</div>
                                    </StatCard>
                                </StatsGrid>
                                <p>
                                    <strong>Drake Soul Buff:</strong> All your pieces gain +20 Attack Damage permanently.
                                </p>

                                <h3>Baron Nashor</h3>
                                <HighlightBox variant="success">
                                    <p><strong>Spawns:</strong> Square z5 at the end of Red's 10th turn</p>
                                    <p><strong>HP:</strong> 500</p>
                                </HighlightBox>

                                <h4>Baron Kill Rewards</h4>
                                <StatsGrid>
                                    <StatCard>
                                        <div className="label">Gold Reward</div>
                                        <div className="value">+250</div>
                                    </StatCard>
                                    <StatCard>
                                        <div className="label">Minions Buff</div>
                                        <div className="value">+40 AD / +40 Armor</div>
                                    </StatCard>
                                    <StatCard>
                                        <div className="label">Champions Buff</div>
                                        <div className="value">+20 Stats</div>
                                    </StatCard>
                                </StatsGrid>
                                <p>
                                    <strong>Hand of Baron Buff:</strong>
                                </p>
                                <ul>
                                    <li><strong>Minions & Siege Minions:</strong> +40 AD and +40 Physical Resistance</li>
                                    <li><strong>Champions:</strong> +20 AP, +20 AD, +20 Physical Resistance, +20 Magic Resistance</li>
                                </ul>

                                <h3>Monster Mechanics</h3>
                                <ul>
                                    <li><strong>Neutral:</strong> Can be attacked by any player</li>
                                    <li><strong>Stationary:</strong> Do not move or attack</li>
                                    <li><strong>Last Hit Matters:</strong> Only the player who lands the killing blow receives rewards</li>
                                    <li><strong>Respawn:</strong> Monsters respawn 10 turns after being slain</li>
                                </ul>

                                <HighlightBox variant="warning">
                                    <strong>Strategic Tip:</strong> Control around neutral objectives is crucial!
                                    Securing Baron and Drake can swing the game in your favor with powerful buffs.
                                </HighlightBox>
                            </SectionContent>
                        </Section>
                    )}

                    {activeSection === 'shop' && (
                        <Section
                            key="shop"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SectionTitle>
                                <Coins />
                                Gold & Item Shop
                            </SectionTitle>
                            <SectionContent>
                                <h3>Earning Gold</h3>
                                <p>Gold is the currency used to purchase items for your champions. You earn gold through:</p>

                                <StatsGrid>
                                    <StatCard>
                                        <div className="label">Passive Income</div>
                                        <div className="value">+5 per turn</div>
                                    </StatCard>
                                    <StatCard>
                                        <div className="label">Round Bonus</div>
                                        <div className="value">+50 every 20 rounds</div>
                                    </StatCard>
                                    <StatCard>
                                        <div className="label">Drake Kill</div>
                                        <div className="value">+50</div>
                                    </StatCard>
                                    <StatCard>
                                        <div className="label">Baron Kill</div>
                                        <div className="value">+250</div>
                                    </StatCard>
                                </StatsGrid>

                                <h4>Passive Income</h4>
                                <p>
                                    Each player gains <strong>5 Gold at the start of their turn</strong>. This ensures
                                    steady economy growth throughout the game.
                                </p>

                                <h4>Round Bonus</h4>
                                <p>
                                    Both players gain <strong>+50 Gold every 20 rounds</strong> (rounds 20, 40, 60, etc.).
                                    This helps accelerate late-game item purchases.
                                </p>

                                <h4>Item Refund on Death</h4>
                                <HighlightBox variant="info">
                                    When a champion dies, <strong>50% of the total value of their equipped items</strong> is
                                    refunded to the owner. This helps mitigate the loss of an itemized champion.
                                </HighlightBox>

                                <h4>Slaying Enemy Pieces</h4>
                                <p>Gold values for enemy pieces:</p>
                                <ul>
                                    <li><strong>Champion:</strong> 50 Gold</li>
                                    <li><strong>Super Minion:</strong> 50 Gold</li>
                                    <li><strong>Siege Minion:</strong> 40 Gold</li>
                                    <li><strong>Caster Minion:</strong> 25 Gold</li>
                                    <li><strong>Melee Minion:</strong> 20 Gold</li>
                                </ul>

                                <h3>The Item Shop</h3>
                                <HighlightBox variant="info">
                                    <strong>Important:</strong> You can buy <strong>ONE item at the START of your turn</strong>,
                                    before performing your board action. After buying an item or performing any board action,
                                    you cannot buy more items until your next turn.
                                </HighlightBox>

                                <h4>Using the Shop</h4>
                                <ol>
                                    <li>At the start of your turn, you may purchase ONE basic item</li>
                                    <li>Assign the item to any of your champions</li>
                                    <li>If the champion has two basic items, they <strong>automatically combine</strong> into a combined item</li>
                                    <li>Then perform your board action (move, attack, or use ability)</li>
                                </ol>

                                <h4>Item Combining (TFT-Style)</h4>
                                <HighlightBox variant="warning">
                                    <strong>Auto-Combine:</strong> When a champion has two basic items, they automatically
                                    combine into a more powerful combined item! Plan your item builds strategically.
                                </HighlightBox>

                                <h4>Item Slots</h4>
                                <p>
                                    Each champion has <strong>3 item slots</strong>. Only champions can equip items
                                    (not minions, Poro, or neutral monsters).
                                </p>

                                <h4>Stat Bonuses</h4>
                                <p>Items provide various stat bonuses that enhance your champions:</p>
                                <ul>
                                    <li><strong>Offensive:</strong> +AD, +AP, Critical Strike Chance, Sunder</li>
                                    <li><strong>Defensive:</strong> +HP, +Physical Resistance, +Magic Resistance, Shields</li>
                                    <li><strong>Utility:</strong> +Speed, +Attack Range, Cooldown Reduction</li>
                                    <li><strong>Special Effects:</strong> Lifesteal, Burn, Stun, and more</li>
                                </ul>

                                <HighlightBox variant="warning">
                                    <strong>Strategic Tip:</strong> Balance your gold spending between items and saving for
                                    crucial moments. Some champions benefit more from certain stat bonuses than others!
                                </HighlightBox>

                                <h3>Economy Management</h3>
                                <p>
                                    Managing your gold effectively is key to victory. Consider:
                                </p>
                                <ul>
                                    <li>When to buy items vs. maintain board pressure</li>
                                    <li>Prioritizing items for your strongest champions</li>
                                    <li>Saving gold for crucial power spikes</li>
                                    <li>Contesting neutral objectives for gold and buffs</li>
                                </ul>
                            </SectionContent>
                        </Section>
                    )}
                </AnimatePresence>
            </ContentWrapper>
        </PageContainer>
    )
}

export default InstructionsPage

