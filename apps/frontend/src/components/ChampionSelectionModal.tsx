import { AnimatePresence, motion } from "framer-motion";
import { Check, RotateCcw, Shield, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import styled from "styled-components";

const ModalBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
`

const ModalContainer = styled(motion.div)`
  background: var(--secondary-bg);
  border: 2px solid var(--gold);
  border-radius: 12px;
  padding: 24px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  position: relative;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border);
  
  h3 {
    color: var(--gold);
    margin: 0;
    font-size: 20px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`

const CloseButton = styled.button`
  background: transparent;
  border: 2px solid var(--border);
  color: var(--primary-text);
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--gold);
    color: var(--gold);
    transform: scale(1.1);
  }
`

const SquadSection = styled.div`
  margin-bottom: 24px;
  
  h4 {
    color: var(--primary-text);
    font-size: 16px;
    font-weight: bold;
    margin: 0 0 12px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`

const ChampionDropdowns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
`

const DropdownWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  label {
    color: var(--secondary-text);
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
  }
  
  select {
    background: var(--primary-bg);
    border: 2px solid var(--border);
    color: var(--primary-text);
    padding: 8px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--gold);
    }
    
    &:focus {
      outline: none;
      border-color: var(--gold);
      box-shadow: 0 0 0 3px rgba(200, 155, 60, 0.1);
    }
  }
`

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid var(--border);
`

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  border: none;
  color: var(--primary-bg);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(200, 155, 60, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`

const SecondaryButton = styled.button`
  background: transparent;
  border: 2px solid var(--border);
  color: var(--primary-text);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--gold);
    color: var(--gold);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`

interface ChampionSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (blueChampions: string[], redChampions: string[]) => void;
    currentBlueChampions: string[];
    currentRedChampions: string[];
    availableChampions: string[];
    isResetting: boolean;
}

export const ChampionSelectionModal: React.FC<ChampionSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    currentBlueChampions,
    currentRedChampions,
    availableChampions,
    isResetting,
}) => {
    const [blueChampions, setBlueChampions] = useState<string[]>(currentBlueChampions);
    const [redChampions, setRedChampions] = useState<string[]>(currentRedChampions);

    useEffect(() => {
        if (isOpen) {
            setBlueChampions(currentBlueChampions);
            setRedChampions(currentRedChampions);
        }
    }, [isOpen, currentBlueChampions, currentRedChampions]);

    const handleBlueChange = (index: number, value: string) => {
        const newChampions = [...blueChampions];
        newChampions[index] = value;
        setBlueChampions(newChampions);
    };

    const handleRedChange = (index: number, value: string) => {
        const newChampions = [...redChampions];
        newChampions[index] = value;
        setRedChampions(newChampions);
    };

    const handleKeepCurrent = () => {
        onConfirm(currentBlueChampions, currentRedChampions);
    };

    const handleResetWithNew = () => {
        onConfirm(blueChampions, redChampions);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <ModalBackdrop
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <ModalContainer
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ModalHeader>
                        <h3>
                            <RotateCcw size={20} />
                            Reset Game with Champion Selection
                        </h3>
                        <CloseButton onClick={onClose}>
                            <X size={18} />
                        </CloseButton>
                    </ModalHeader>

                    <SquadSection>
                        <h4>
                            <Shield size={16} style={{ color: '#5bc0de' }} />
                            Blue Player Squad
                        </h4>
                        <ChampionDropdowns>
                            {blueChampions.map((champion, index) => (
                                <DropdownWrapper key={`blue-${index}`}>
                                    <label>Champion {index + 1}</label>
                                    <select
                                        value={champion}
                                        onChange={(e) => handleBlueChange(index, e.target.value)}
                                        disabled={isResetting}
                                    >
                                        {availableChampions.map((champ) => (
                                            <option key={champ} value={champ}>
                                                {champ}
                                            </option>
                                        ))}
                                    </select>
                                </DropdownWrapper>
                            ))}
                        </ChampionDropdowns>
                    </SquadSection>

                    <SquadSection>
                        <h4>
                            <Shield size={16} style={{ color: '#e74c3c' }} />
                            Red Player Squad
                        </h4>
                        <ChampionDropdowns>
                            {redChampions.map((champion, index) => (
                                <DropdownWrapper key={`red-${index}`}>
                                    <label>Champion {index + 1}</label>
                                    <select
                                        value={champion}
                                        onChange={(e) => handleRedChange(index, e.target.value)}
                                        disabled={isResetting}
                                    >
                                        {availableChampions.map((champ) => (
                                            <option key={champ} value={champ}>
                                                {champ}
                                            </option>
                                        ))}
                                    </select>
                                </DropdownWrapper>
                            ))}
                        </ChampionDropdowns>
                    </SquadSection>

                    <ModalActions>
                        <SecondaryButton onClick={onClose} disabled={isResetting}>
                            <X size={16} />
                            Cancel
                        </SecondaryButton>
                        <SecondaryButton onClick={handleKeepCurrent} disabled={isResetting}>
                            <Shield size={16} />
                            Keep Current Squad
                        </SecondaryButton>
                        <PrimaryButton onClick={handleResetWithNew} disabled={isResetting}>
                            <Check size={16} />
                            {isResetting ? 'Resetting...' : 'Reset with New Squad'}
                        </PrimaryButton>
                    </ModalActions>
                </ModalContainer>
            </ModalBackdrop>
        </AnimatePresence>
    );
};