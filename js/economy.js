export function createEconomy(start) {
  return {
    coins: start,
    earn(amount) { this.coins += amount; },
    canAfford(cost) { return this.coins >= cost; },
    spend(cost) {
      if (!this.canAfford(cost)) return false;
      this.coins -= cost;
      return true;
    },
  };
}
