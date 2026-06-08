import { describe, expect, it } from 'vitest';
import { applyPetBattleMove, createPetBattle } from './pet-battle';

describe('pet battle', () => {
  it('creates a scaled battle with full hp', () => {
    const battle = createPetBattle(3, () => 0);
    expect(battle.rivalName).toBe('Slime xanh');
    expect(battle.playerHp).toBe(battle.playerMaxHp);
    expect(battle.rivalHp).toBe(battle.rivalMaxHp);
    expect(battle.finished).toBeNull();
  });

  it('correct attacks damage the rival and build streak', () => {
    const battle = createPetBattle(2, () => 0);
    const next = applyPetBattleMove(battle, 'spark', true, 2);
    expect(next.rivalHp).toBeLessThan(battle.rivalHp);
    expect(next.streak).toBe(1);
    expect(next.round).toBe(2);
  });

  it('wrong answers reset streak and damage the player', () => {
    const battle = { ...createPetBattle(2, () => 0), streak: 3 };
    const next = applyPetBattleMove(battle, 'spark', false, 2);
    expect(next.streak).toBe(0);
    expect(next.playerHp).toBeLessThan(battle.playerHp);
  });

  it('can finish with a win', () => {
    const battle = { ...createPetBattle(5, () => 0), rivalHp: 8 };
    const next = applyPetBattleMove(battle, 'spark', true, 5);
    expect(next.finished).toBe('win');
    expect(next.rivalHp).toBe(0);
  });
});
