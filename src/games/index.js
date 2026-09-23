const modules = import.meta.glob("./*.jsx", { eager: true });
export const plugins = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => {
    const game = module.default;
    if (!game?.id || !game.name || !game.Play || !game.rules)
      throw new Error(`Invalid game plugin: ${path}`);
    return [game.id, game];
  }),
);
