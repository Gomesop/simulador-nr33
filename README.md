# Simulador de Entrada Segura - Treinamento de NR 33

Este é um jogo de simulação interativo e dinâmico voltado para o treinamento e capacitação de equipes na **NR 33 (Segurança e Saúde nos Trabalhos em Espaços Confinados)**. O simulador desafia o usuário a atuar como Supervisor de Entrada e Vigia, seguindo à risca todas as exigências legais para evitar acidentes graves.

## 🎮 Fases do Jogo

O simulador é estruturado em 5 fases sequenciais:

1. **Inspeção de Riscos**: Inspecionar o cenário industrial de um tanque químico e localizar 4 não-conformidades críticas da NR 33 (falta de raqueteamento/bloqueio físico, falta de sinalização, quadro elétrico desprotegido exposto e poça de resíduo químico inflamável no fundo).
2. **Equipamentos e Calibração**: Selecionar os 6 equipamentos industriais obrigatórios corretos no inventário (evitando itens não intrinsecamente seguros ou insuficientes) e calibrar o detector multigás em uma interface interativa (bump test em ar limpo).
3. **Medição de Gases**: Descer a sonda do detector em 3 alturas do tanque (topo, meio e fundo) para detectar gases de diferentes densidades (Metano, Monóxido de Carbono e Sulfeto de Hidrogênio) e ativar o sistema de ventilação mecânica forçada para limpar a atmosfera.
4. **Emissão de PET**: Preencher o checklist de liberação de segurança e aplicar as assinaturas digitais do Supervisor de Entrada e do Vigia arrastando e soltando (ou clicando) as credenciais autorizadas nos respectivos campos da Permissão de Entrada e Trabalho.
5. **Vigilância Ativa (O Vigia)**: Acompanhar o trabalho em tempo real monitorando telemetrias cardíacas e de oxigênio. O jogador deve solucionar eventos aleatórios sob pressão (trabalhador relatando mal-estar, alarme de vazamento de gás, invasão de terceiros).
   - **Regra de Ouro**: Se o trabalhador passar mal, o vigia **nunca deve entrar no tanque**. Ele deve acionar o resgate mecânico de fora e acionar a equipe de emergência. A tentativa de entrada gera um Game Over pedagógico imediato explicando a estatística de fatalidades em resgates improvisados.

---

## 🛠️ Recursos Visuais e Sonoros Premium

- **Design Industrial**: Paleta de cores baseada em preto asfalto, cinza grafite e contrastes brilhantes de amarelo de atenção, verde de segurança e vermelho de alarme.
- **Web Audio API**: Geração de som em tempo real no próprio navegador para cliques, beeps de carregamento e o alarmante apito do detector multigás quando exposto a atmosferas tóxicas.
- **Micro-animações**: Ventilador que gira de verdade com a exaustão ativada, hotspots de risco que expandem com ondas de pulsação, e barra de vida que muda de cor conforme os erros de segurança cometidos.
- **Compatibilidade Responsiva**: Projetado para rodar perfeitamente em telas móveis, tablets e desktops.

---

## 📁 Estrutura do Projeto

```
nr33-training-game/
├── index.html          # Interface estruturada de telas e elementos interativos do jogo
├── styles.css          # Design industrial, layouts grid/flex e animações CSS3
├── game.js             # Motor de jogo, sons sintetizados e árvore lógica das fases
└── README.md           # Este manual explicativo do projeto
```

---

## 🚀 Como Executar o Projeto

Como o jogo foi construído utilizando apenas tecnologias web nativas sem build-steps ou dependências externas pesadas:

1. Baixe a pasta do projeto.
2. Dê um clique duplo no arquivo `index.html` para abrir e jogar diretamente no seu navegador!
3. Alternativamente, você pode servir a pasta localmente (ex: executando `python -m http.server 8080` no terminal) e acessar pelo endereço `http://localhost:8080`.
