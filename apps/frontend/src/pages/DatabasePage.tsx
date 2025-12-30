import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, Database as DatabaseIcon } from 'lucide-react'
import { AttackRangeIndicator } from '../components/AttackRangeIndicator'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { fetchDatabaseData } from '../store/gameSlice'
import type { ChampionData, ItemData } from '../store/gameSlice'

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
  padding: 40px 20px;
`

const ContentWrapper = styled.div`
  max-width: 1400px;
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

const TabNav = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
  justify-content: center;
`

const TabButton = styled(motion.button) <{ active?: boolean }>`
  background: ${props => props.active
        ? 'linear-gradient(135deg, var(--gold) 0%, #b8860b 100%)'
        : 'var(--secondary-bg)'};
  color: ${props => props.active ? 'var(--primary-bg)' : 'var(--primary-text)'};
  border: 2px solid ${props => props.active ? 'var(--gold)' : 'var(--border)'};
  border-radius: 8px;
  padding: 12px 32px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
    border-color: var(--gold);
  }
`

const SearchContainer = styled.div`
  margin-bottom: 32px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`

const SearchInput = styled.input`
  width: 100%;
  background: var(--primary-bg);
  border: 2px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px 16px 48px;
  color: var(--primary-text);
  font-size: 1rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(200, 155, 60, 0.1);
  }
  
  &::placeholder {
    color: var(--secondary-text);
  }
`

const SearchWrapper = styled.div`
  position: relative;
  
  svg {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--secondary-text);
  }
`

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 80px 20px;
  
  .spinner {
    width: 60px;
    height: 60px;
    border: 4px solid var(--border);
    border-top: 4px solid var(--gold);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 24px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  p {
    color: var(--secondary-text);
    font-size: 1.1rem;
  }
`

const ErrorContainer = styled.div`
  background: rgba(200, 170, 110, 0.1);
  border: 2px solid var(--gold);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  color: var(--primary-text);
  
  h3 {
    color: var(--gold);
    margin-bottom: 12px;
  }
`

const ChampionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`

const ChampionCard = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: var(--gold);
  }
`

const ChampionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  
  img {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    border: 2px solid var(--gold);
    object-fit: cover;
  }
  
  .placeholder-icon {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    border: 2px solid var(--border);
    background: var(--accent-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
  }
  
  h3 {
    color: var(--gold);
    font-size: 1.5rem;
    margin: 0;
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`

const StatItem = styled.div`
  background: var(--accent-bg);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  cursor: help;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--gold);
    background: rgba(200, 155, 60, 0.1);
    
    .tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }
  
  .label {
    color: var(--secondary-text);
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 6px;
    
    img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
  }
  
  .value {
    color: var(--primary-text);
    font-weight: bold;
    font-size: 1rem;
  }
  
  .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-5px);
    background: var(--primary-bg);
    border: 2px solid var(--gold);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.75rem;
    color: var(--primary-text);
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    max-width: 250px;
    white-space: normal;
    text-align: center;
    
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--gold);
    }
  }
`

const SkillSection = styled.div`
  background: var(--primary-bg);
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
  
  .skill-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    
    h4 {
      color: var(--hover);
      margin: 0;
      font-size: 1.1rem;
    }
    
    .skill-type {
      background: var(--gold);
      color: var(--primary-bg);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
      text-transform: uppercase;
    }
  }
  
  .skill-description {
    color: var(--primary-text);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 8px;
  }
  
  .skill-cooldown {
    color: var(--secondary-text);
    font-size: 0.85rem;
  }
`

const AuraSection = styled.div`
  background: rgba(5, 150, 170, 0.1);
  border: 1px solid var(--hover);
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  
  .aura-name {
    color: var(--hover);
    font-weight: bold;
    margin-bottom: 4px;
  }
  
  .aura-description {
    color: var(--primary-text);
    font-size: 0.9rem;
  }
`

const SectionTitle = styled.h2`
  color: var(--gold);
  font-size: 2rem;
  margin-bottom: 24px;
  margin-top: 40px;
  
  &:first-of-type {
    margin-top: 0;
  }
`

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`

const ItemCard = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: var(--gold);
  }
`

const ItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  
  img {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    border: 2px solid var(--gold);
  }
  
  .item-info {
    flex: 1;
    
    h3 {
      color: var(--gold);
      font-size: 1.2rem;
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .cost {
      color: var(--hover);
      font-weight: bold;
      font-size: 1rem;
    }
  }
`

const UniqueBadge = styled.span`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  color: var(--primary-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
`

const ItemEffects = styled.div`
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  
  .effect {
    color: var(--primary-text);
    padding: 6px 10px;
    font-size: 0.9rem;
    background: rgba(200, 155, 60, 0.15);
    border: 1px solid rgba(200, 155, 60, 0.3);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    
    img {
      width: 14px;
      height: 14px;
      object-fit: contain;
    }
    
    span {
      color: var(--primary-text);
      font-weight: 600;
    }
    
    &.positive {
      color: var(--gold);
    }
  }
`

const ItemDescription = styled.p`
  color: var(--secondary-text);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 12px;
  font-style: italic;
`

const RecipeDisplay = styled.div`
  align-self: flex-end;
  justify-self: center;
  align-items: center;
  justify-content: center;
  background: var(--primary-bg);
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 0.9rem;
  margin-top: 12px;
  border: 1px solid var(--border);
  
  .recipe-item {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-bg);
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 4px;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--gold);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
    }
    
    &.result {
      border-color: var(--gold);
      box-shadow: 0 0 8px rgba(200, 155, 60, 0.3);
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .item-fallback {
      font-size: 10px;
      font-weight: bold;
      color: var(--gold);
      text-align: center;
    }
  }
  
  .separator {
    color: var(--gold);
    font-weight: bold;
    font-size: 1.2rem;
  }
`

// Helper function to get stat icon path
const getStatIcon = (stat: string): string => {
    const iconMap: { [key: string]: string } = {
        ad: '/icons/AD.svg',
        ap: '/icons/AP.svg',
        maxHp: '/icons/icon-hp.svg',
        physicalResistance: '/icons/Armor.svg',
        magicResistance: '/icons/MagicResist.svg',
        speed: '/icons/speed.png',
        attackRange: '/icons/Range.svg',
        sunder: '/icons/AS.svg',
        criticalChance: '/icons/CritChance.svg',
        criticalDamage: '/icons/CritDamage.svg',
        damageAmplification: '/icons/icon-da.png',
        cooldownReduction: '/icons/icon-cdr.webp',
        lifesteal: '/icons/icon-sv.png',
        hpRegen: '/icons/icon-hp-regen.png',
        goldValue: '/icons/gold.png',
        durability: '/icons/icon-durability.png',
    };
    return iconMap[stat] || '/icons/AD.svg';
};

// Helper function to get stat tooltips
const getStatTooltip = (stat: string): string => {
    const tooltipMap: { [key: string]: string } = {
        ad: 'Attack Damage - Damage dealt by basic attacks, reduced by Physical Resistance',
        ap: 'Ability Power - Primarily used to scale champion special abilities',
        maxHp: 'Health Points - Amount of damage a piece can sustain before being slain',
        physicalResistance: 'Physical Resistance (Armor) - Reduces incoming damage from AD attacks',
        magicResistance: 'Magic Resistance - Reduces incoming damage from AP attacks',
        speed: 'Speed - Maximum number of squares a piece can move in a single direction per turn',
        attackRange: 'Attack Range - Maximum number of squares away a piece can attack',
        sunder: 'Sunder (Armor Penetration) - Reduces target\'s Physical Resistance when calculating damage',
        criticalChance: 'Critical Chance - Percentage chance for basic attacks to deal critical damage',
        criticalDamage: 'Critical Damage - Damage multiplier for critical strikes (default 150%)',
        damageAmplification: 'Damage Amplification - Percentage increase to all damage dealt',
        cooldownReduction: 'Cooldown Reduction - Reduces ability cooldown by this many turns',
        lifesteal: 'Lifesteal - Percentage of AD damage dealt converted to HP healing',
        hpRegen: 'HP Regeneration - HP regenerated at the start of each turn',
        goldValue: 'Gold Value - Gold awarded to opponent upon slaying this piece',
    };
    return tooltipMap[stat] || '';
};

const DatabasePage: React.FC = () => {
    const dispatch = useAppDispatch()
    const { champions, basicItems, combinedItems, databaseLoading, databaseError } = useAppSelector(state => state.game)

    const [activeTab, setActiveTab] = useState<'champions' | 'items'>('champions')
    const [championSearch, setChampionSearch] = useState('')
    const [itemSearch, setItemSearch] = useState('')

    useEffect(() => {
        dispatch(fetchDatabaseData())
    }, [dispatch])

    const filteredChampions = champions.filter(champion =>
        champion.name.toLowerCase().includes(championSearch.toLowerCase())
    )

    const filteredBasicItems = basicItems.filter(item =>
        item.name.toLowerCase().includes(itemSearch.toLowerCase())
    )

    const filteredCombinedItems = combinedItems.filter(item =>
        item.name.toLowerCase().includes(itemSearch.toLowerCase())
    )

    const formatAttackRange = (attackRange: any): string => {
        if (!attackRange) return 'N/A'
        const { range } = attackRange
        return `${range}`
    }

    const formatEffects = (effects: any[]): string[] => {
        return effects.map(effect => {
            const sign = effect.value > 0 ? '+' : ''
            const value = effect.type === 'multiply' ? `×${effect.value}` : `${sign}${effect.value}`
            const statName = effect.stat
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str: string) => str.toUpperCase())
            return `${value} ${statName}`
        })
    }

    const getItemById = (itemId: string): ItemData | undefined => {
        return basicItems.find(i => i.id === itemId)
    }

    if (databaseLoading) {
        return (
            <PageContainer>
                <ContentWrapper>
                    <LoadingContainer>
                        <div className="spinner"></div>
                        <p>Loading game database...</p>
                    </LoadingContainer>
                </ContentWrapper>
            </PageContainer>
        )
    }

    if (databaseError) {
        return (
            <PageContainer>
                <ContentWrapper>
                    <ErrorContainer>
                        <h3>Error Loading Data</h3>
                        <p>{databaseError}</p>
                        <button
                            onClick={() => dispatch(fetchDatabaseData())}
                            style={{
                                marginTop: '16px',
                                padding: '12px 24px',
                                background: 'var(--gold)',
                                color: 'var(--primary-bg)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Retry
                        </button>
                    </ErrorContainer>
                </ContentWrapper>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <ContentWrapper>
                <Header
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1>
                        <DatabaseIcon size={48} />
                        Game Database
                    </h1>
                    <p>
                        Browse all champions and items. View stats, abilities, and item effects to plan your strategy!
                    </p>
                </Header>

                <TabNav>
                    <TabButton
                        active={activeTab === 'champions'}
                        onClick={() => setActiveTab('champions')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Champions ({champions.length})
                    </TabButton>
                    <TabButton
                        active={activeTab === 'items'}
                        onClick={() => setActiveTab('items')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Items ({basicItems.length + combinedItems.length})
                    </TabButton>
                </TabNav>

                <AnimatePresence mode="wait">
                    {activeTab === 'champions' && (
                        <motion.div
                            key="champions"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SearchContainer>
                                <SearchWrapper>
                                    <Search size={20} />
                                    <SearchInput
                                        type="text"
                                        placeholder="Search champions..."
                                        value={championSearch}
                                        onChange={(e) => setChampionSearch(e.target.value)}
                                    />
                                </SearchWrapper>
                            </SearchContainer>

                            <ChampionGrid>
                                {filteredChampions.map((champion, index) => (
                                    <ChampionCard
                                        key={champion.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                    >
                                        <ChampionHeader>
                                            <img
                                                src={`/icons/${champion.name.toLowerCase()}.webp`}
                                                alt={champion.name}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                }}
                                            />
                                            <h3>{champion.name}</h3>
                                        </ChampionHeader>

                                        {/* Primary Stats */}
                                        <StatsGrid>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('maxHp')} alt="HP" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.maxHp || 'N/A'}</div>
                                                <div className="tooltip">{getStatTooltip('maxHp')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('ad')} alt="AD" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.ad || 'N/A'}</div>
                                                <div className="tooltip">{getStatTooltip('ad')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('ap')} alt="AP" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.ap || 0}</div>
                                                <div className="tooltip">{getStatTooltip('ap')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('speed')} alt="Speed" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.speed || 1}</div>
                                                <div className="tooltip">{getStatTooltip('speed')}</div>
                                            </StatItem>
                                        </StatsGrid>

                                        {/* Defensive Stats */}
                                        <StatsGrid style={{ marginBottom: '16px' }}>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('physicalResistance')} alt="Physical Res" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.physicalResistance || 0}</div>
                                                <div className="tooltip">{getStatTooltip('physicalResistance')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('magicResistance')} alt="Magic Res" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.magicResistance || 0}</div>
                                                <div className="tooltip">{getStatTooltip('magicResistance')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('hpRegen')} alt="HP Regen" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.hpRegen || 0}</div>
                                                <div className="tooltip">{getStatTooltip('hpRegen')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('attackRange')} alt="Range" width={16} height={16} />
                                                </div>
                                                <div className="value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {formatAttackRange(champion.stats.attackRange)}
                                                    {champion.stats.attackRange && (
                                                        <AttackRangeIndicator
                                                            attackRange={champion.stats.attackRange}
                                                            size={18}
                                                        />
                                                    )}
                                                </div>
                                                <div className="tooltip">{getStatTooltip('attackRange')}</div>
                                            </StatItem>
                                        </StatsGrid>

                                        {/* Advanced Stats */}
                                        <StatsGrid style={{ marginBottom: '16px' }}>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('criticalChance')} alt="Crit Chance" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.criticalChance || 0}%</div>
                                                <div className="tooltip">{getStatTooltip('criticalChance')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('criticalDamage')} alt="Crit Damage" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.criticalDamage || 125}%</div>
                                                <div className="tooltip">{getStatTooltip('criticalDamage')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('sunder')} alt="Sunder" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.sunder || 0}</div>
                                                <div className="tooltip">{getStatTooltip('sunder')}</div>
                                            </StatItem>
                                            <StatItem>
                                                <div className="label">
                                                    <img src={getStatIcon('lifesteal')} alt="Lifesteal" width={16} height={16} />
                                                </div>
                                                <div className="value">{champion.stats.lifesteal || 0}%</div>
                                                <div className="tooltip">{getStatTooltip('lifesteal')}</div>
                                            </StatItem>
                                        </StatsGrid>

                                        <SkillSection>
                                            <div className="skill-header">
                                                <img
                                                    src={`/icons/${champion.name.toLowerCase()}_skill.webp`}
                                                    alt={champion.skill.name || 'Skill'}
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '8px',
                                                        marginRight: '12px',
                                                        border: '2px solid var(--gold)',
                                                        objectFit: 'cover'
                                                    }}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                    }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <h4>{champion.skill.name || 'Unknown Skill'}</h4>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                                        {champion.skill.type && (
                                                            <span className="skill-type">{champion.skill.type}</span>
                                                        )}
                                                        {champion.skill.cooldown !== undefined && champion.skill.cooldown > 0 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                                                <img src={getStatIcon('cooldownReduction')} alt="Cooldown" width={14} height={14} />
                                                                <span style={{ color: 'var(--gold)' }}>{champion.skill.cooldown}</span>
                                                            </div>
                                                        )}
                                                        {champion.skill.attackRange?.range && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                                                <img src={getStatIcon('attackRange')} alt="Range" width={14} height={14} />
                                                                <span style={{ color: 'var(--gold)' }}>{champion.skill.attackRange.range}</span>
                                                            </div>
                                                        )}
                                                        {champion.skill.attackRange && (
                                                            <AttackRangeIndicator
                                                                attackRange={champion.skill.attackRange}
                                                                size={18}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="skill-description">
                                                {champion.skill.description || 'No description available.'}
                                            </div>
                                        </SkillSection>
                                    </ChampionCard>
                                ))}
                            </ChampionGrid>

                            {filteredChampions.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-text)' }}>
                                    No champions found matching "{championSearch}"
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'items' && (
                        <motion.div
                            key="items"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SearchContainer>
                                <SearchWrapper>
                                    <Search size={20} />
                                    <SearchInput
                                        type="text"
                                        placeholder="Search items..."
                                        value={itemSearch}
                                        onChange={(e) => setItemSearch(e.target.value)}
                                    />
                                </SearchWrapper>
                            </SearchContainer>

                            {filteredBasicItems.length > 0 && (
                                <>
                                    <SectionTitle>Basic Items</SectionTitle>
                                    <ItemGrid>
                                        {filteredBasicItems.map((item, index) => (
                                            <ItemCard
                                                key={item.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.03 }}
                                            >
                                                <ItemHeader>
                                                    {item.icon && <img src={item.icon} alt={item.name} />}
                                                    <div className="item-info">
                                                        <h3>
                                                            {item.name}
                                                            {item.unique && <UniqueBadge>UNIQUE</UniqueBadge>}
                                                        </h3>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div className="cost">{item.cost}g</div>
                                                            {(item as any).cooldown > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                                                                    <img src={getStatIcon('cooldownReduction')} alt="Cooldown" width={14} height={14} />
                                                                    <span style={{ color: 'var(--gold)' }}>{(item as any).cooldown}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </ItemHeader>
                                                <ItemEffects>
                                                    {item.effects.filter((effect) => !effect.conditional).map((effect, i) => (
                                                        <div key={i} className="effect positive">
                                                            <img src={getStatIcon(effect.stat)} alt={effect.stat} width={14} height={14} />
                                                            <span>
                                                                +{effect.type === 'multiply' ? `${Math.floor(effect.value * 100 - 100)}%` : effect.value} {effect.stat.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </ItemEffects>
                                                {item.description && (
                                                    <ItemDescription>{item.description}</ItemDescription>
                                                )}
                                            </ItemCard>
                                        ))}
                                    </ItemGrid>
                                </>
                            )}

                            {filteredCombinedItems.length > 0 && (
                                <>
                                    <SectionTitle>Combined Items</SectionTitle>
                                    <ItemGrid>
                                        {filteredCombinedItems.map((item, index) => (
                                            <ItemCard
                                                key={item.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.03 }}
                                            >
                                                <ItemHeader>
                                                    {item.icon && <img src={item.icon} alt={item.name} />}
                                                    <div className="item-info">
                                                        <h3>
                                                            {item.name}
                                                            {item.unique && <UniqueBadge>UNIQUE</UniqueBadge>}
                                                        </h3>
                                                        {(item as any).cooldown > 0 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                                                                <span style={{ color: 'var(--gold)' }}>{(item as any).cooldown} turn cooldown</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </ItemHeader>
                                                <ItemEffects>
                                                    {item.effects.filter((effect) => !effect.conditional).map((effect, i) => (
                                                        <div key={i} className="effect positive">
                                                            <img src={getStatIcon(effect.stat)} alt={effect.stat} width={14} height={14} />
                                                            <span>
                                                                +{effect.type === 'multiply' ? `${Math.round(effect.value * 100 - 100)}%` : effect.value} {effect.stat.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </ItemEffects>
                                                {item.description && (
                                                    <ItemDescription>{item.description}</ItemDescription>
                                                )}
                                                {item.recipe && (
                                                    <RecipeDisplay>
                                                        <div className="recipe-item">
                                                            {getItemById(item.recipe[0])?.icon ? (
                                                                <img
                                                                    src={getItemById(item.recipe[0])!.icon}
                                                                    alt={getItemById(item.recipe[0])!.name}
                                                                    title={getItemById(item.recipe[0])!.name}
                                                                />
                                                            ) : (
                                                                <span className="item-fallback">{getItemById(item.recipe[0])?.name || item.recipe[0]}</span>
                                                            )}
                                                        </div>
                                                        <span className="separator">+</span>
                                                        <div className="recipe-item">
                                                            {getItemById(item.recipe[1])?.icon ? (
                                                                <img
                                                                    src={getItemById(item.recipe[1])!.icon}
                                                                    alt={getItemById(item.recipe[1])!.name}
                                                                    title={getItemById(item.recipe[1])!.name}
                                                                />
                                                            ) : (
                                                                <span className="item-fallback">{getItemById(item.recipe[1])?.name || item.recipe[1]}</span>
                                                            )}
                                                        </div>
                                                        <span className="separator">→</span>
                                                        <div className="recipe-item result">
                                                            {item.icon ? (
                                                                <img
                                                                    src={item.icon}
                                                                    alt={item.name}
                                                                    title={item.name}
                                                                />
                                                            ) : (
                                                                <span className="item-fallback">{item.name}</span>
                                                            )}
                                                        </div>
                                                    </RecipeDisplay>
                                                )}
                                            </ItemCard>
                                        ))}
                                    </ItemGrid>
                                </>
                            )}

                            {filteredBasicItems.length === 0 && filteredCombinedItems.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-text)' }}>
                                    No items found matching "{itemSearch}"
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </ContentWrapper>
        </PageContainer>
    )
}

export default DatabasePage

