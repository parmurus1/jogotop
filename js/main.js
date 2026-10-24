'use strict';
// Inicialização.

(function boot() {
  applySettings();
  SCENE.start();
  // Navegadores só liberam áudio depois de um gesto do jogador.
  const unlock = () => { AUDIO.unlock(); applySettings(); updateAtmosphere(); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });
  // Ao girar o aparelho, o combate se redesenha no novo tamanho.
  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => BATTLE.relayout(), 300);
  });
  SCREENS.title();
  // Modo desenvolvedor: carregado só no computador de quem está fazendo o jogo (fica fora do site).
  if (DEV_ALLOWED) { const s = document.createElement('script'); s.src = 'js/dev.js'; s.onload = () => { if (SETTINGS.dev && UI.current === 'title') SCREENS.title(); }; document.body.appendChild(s); }
})();
