// game.js
// Engine de lógica, áudio e interatividades do Simulador NR 33

document.addEventListener("DOMContentLoaded", () => {
  
  // --- A. ESTADO GLOBAL DO JOGO ---
  const state = {
    score: 0,
    safetyScore: 100,
    currentPhase: 0, // 0 = Intro, 1 a 5 = Fases
    phase1: {
      foundHazards: [] // valve, sign, cable, waste
    },
    phase2: {
      selectedEquip: [], // itens selecionados
      powerOn: false,
      calibrated: false,
      isCalibrating: false
    },
    phase3: {
      probeDepth: 0, // 0 a 100
      measuredLevels: { top: false, mid: false, bottom: false },
      ventilationOn: false,
      isAirCleaning: false,
      cleanTimer: null,
      gasesClean: false
    },
    phase4: {
      checklistChecked: { LOTO: false, vent: false, ppe: false, rescue: false, vigia: false },
      signed: { supervisor: false, vigia: false }
    },
    phase5: {
      isMonitoring: false,
      timeElapsed: 0,
      timerInterval: null,
      eventTimer: null,
      activeEvent: null, // 'dizzy', 'gas', 'intruder', 'radio'
      workerHeartRate: 80,
      gasSpike: false,
      selectedSign: null // Para fallback de assinatura no clique
    }
  };

  // --- B. AUDIO SYNTHESIZER (WEB AUDIO API) ---
  const audio = {
    ctx: null,
    alarmInterval: null,
    
    init: function() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    
    playBeep: function(freq, duration, type = "sine") {
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    },
    
    playClick: function() {
      this.playBeep(1200, 0.08);
    },
    
    playSuccess: function() {
      this.playBeep(800, 0.1);
      setTimeout(() => this.playBeep(1000, 0.15), 100);
    },
    
    playFailure: function() {
      this.playBeep(300, 0.25, "sawtooth");
      setTimeout(() => this.playBeep(220, 0.35, "sawtooth"), 150);
    },
    
    startAlarm: function() {
      this.init();
      if (!this.ctx || this.alarmInterval) return;
      
      let toggle = false;
      this.alarmInterval = setInterval(() => {
        const freq = toggle ? 880 : 660;
        this.playBeep(freq, 0.25, "triangle");
        toggle = !toggle;
      }, 350);
    },
    
    stopAlarm: function() {
      if (this.alarmInterval) {
        clearInterval(this.alarmInterval);
        this.alarmInterval = null;
      }
    }
  };

  // --- C. MAPEAMENTOS DE DOM ---
  const elements = {
    // HUD
    scoreDisplay: document.getElementById("score-display"),
    safetyPercent: document.getElementById("safety-percent"),
    safetyBarFill: document.getElementById("safety-bar-fill"),
    
    // Telas/Telas
    screens: {
      intro: document.getElementById("screen-intro"),
      phase1: document.getElementById("screen-phase1"),
      phase2: document.getElementById("screen-phase2"),
      phase3: document.getElementById("screen-phase3"),
      phase4: document.getElementById("screen-phase4"),
      phase5: document.getElementById("screen-phase5")
    },
    
    // Botões de Início/Fim
    btnStartGame: document.getElementById("btn-start-game"),
    btnShowRules: document.getElementById("btn-show-rules"),
    btnCloseRules: document.getElementById("btn-close-rules"),
    btnResetGame: document.getElementById("btn-reset-game"),
    
    // Modais
    modalFeedback: document.getElementById("modal-feedback"),
    modalRules: document.getElementById("modal-rules"),
    modalTitleBar: document.getElementById("modal-title-bar"),
    modalTitleText: document.getElementById("modal-title-text"),
    modalSummaryText: document.getElementById("modal-summary-text"),
    modalDetailsText: document.getElementById("modal-details-text"),
    modalScore: document.getElementById("modal-score"),
    modalSafety: document.getElementById("modal-safety"),
    btnModalClose: document.getElementById("btn-modal-close"),
    btnModalAction: document.getElementById("btn-modal-action"),
    modalStatsPanel: document.getElementById("modal-stats-panel"),
    
    // FASE 1
    hotspots: document.querySelectorAll(".hazard-hotspot"),
    btnNextPhase1: document.getElementById("btn-next-phase1"),
    
    // FASE 2
    equipCards: document.querySelectorAll(".equip-card"),
    calibrationBox: document.getElementById("calibration-box"),
    calibrationLockText: document.getElementById("calibration-lock-text"),
    btnDetPower: document.getElementById("btn-det-power"),
    btnDetCal: document.getElementById("btn-det-cal"),
    detMsg: document.getElementById("detector-msg"),
    detO2: document.getElementById("det-o2"),
    detLel: document.getElementById("det-lel"),
    detCo: document.getElementById("det-co"),
    detH2s: document.getElementById("det-h2s"),
    btnNextPhase2: document.getElementById("btn-next-phase2"),
    
    // FASE 3
    probeCable: document.getElementById("probe-cable"),
    probeHead: document.getElementById("probe-head"),
    liveO2: document.getElementById("live-o2"),
    liveLel: document.getElementById("live-lel"),
    liveCo: document.getElementById("live-co"),
    liveH2s: document.getElementById("live-h2s"),
    gasAlertStrip: document.getElementById("gas-alert-strip"),
    btnToggleFan: document.getElementById("btn-toggle-fan"),
    fanIcon: document.getElementById("fan-icon"),
    ventilationText: document.getElementById("ventilation-text"),
    checkTop: document.getElementById("check-measure-top"),
    checkMid: document.getElementById("check-measure-mid"),
    checkBottom: document.getElementById("check-measure-bottom"),
    btnNextPhase3: document.getElementById("btn-next-phase3"),
    
    // FASE 4
    petGasO2: document.getElementById("pet-gas-o2"),
    petGasLel: document.getElementById("pet-gas-lel"),
    petGasCo: document.getElementById("pet-gas-co"),
    petGasH2s: document.getElementById("pet-gas-h2s"),
    petStatusO2: document.getElementById("pet-status-o2"),
    petStatusLel: document.getElementById("pet-status-lel"),
    petStatusCo: document.getElementById("pet-status-co"),
    petStatusH2s: document.getElementById("pet-status-h2s"),
    petCheckboxes: document.querySelectorAll(".pet-checkbox"),
    dragStamps: document.querySelectorAll(".drag-signature"),
    signatureSlots: document.querySelectorAll(".slot-dropzone"),
    btnNextPhase4: document.getElementById("btn-next-phase4"),
    
    // FASE 5
    workerAvatar: document.getElementById("worker-avatar"),
    workerStatusTag: document.getElementById("worker-status-tag"),
    telHeartRate: document.getElementById("tel-heartrate"),
    telO2: document.getElementById("tel-o2"),
    telTimer: document.getElementById("tel-timer"),
    telRadioStatus: document.getElementById("tel-radio-status"),
    eventBox: document.getElementById("event-box"),
    eventTitleText: document.getElementById("event-title-text"),
    eventDescText: document.getElementById("event-desc-text"),
    btnStartMonitoring: document.getElementById("btn-start-monitoring"),
    btnActionEvacuate: document.getElementById("btn-action-evacuate"),
    btnActionRescue: document.getElementById("btn-action-rescue"),
    btnActionRadio: document.getElementById("btn-action-radio"),
    btnActionIntervene: document.getElementById("btn-action-intervene"),
    btnActionEnter: document.getElementById("btn-action-enter")
  };

  // --- D. LÓGICA DE ATUALIZAÇÃO GERAL DO HUD ---
  
  function addPoints(pts) {
    state.score += pts;
    elements.scoreDisplay.textContent = state.score;
  }
  
  function applyPenalty(amount, reason) {
    state.safetyScore = Math.max(0, state.safetyScore - amount);
    elements.safetyPercent.textContent = `${state.safetyScore}%`;
    elements.safetyBarFill.style.width = `${state.safetyScore}%`;
    
    // Atualiza a cor da barra com base no nível
    if (state.safetyScore > 70) {
      elements.safetyBarFill.style.backgroundColor = "var(--color-safety-green)";
    } else if (state.safetyScore > 40) {
      elements.safetyBarFill.style.backgroundColor = "var(--color-alert-yellow)";
    } else {
      elements.safetyBarFill.style.backgroundColor = "var(--color-danger-red)";
    }
    
    audio.playBeep(200, 0.35, "sawtooth");
    
    if (state.safetyScore <= 0) {
      triggerGameOver("Incapacidade de Segurança!", "Sua pontuação de segurança chegou a 0%. Suas decisões de trabalho geraram perigos extremos que causariam a interdição da área pela fiscalização ou acidentes.", false);
    }
  }

  // --- E. SISTEMA DE DIÁLOGO E MODAL PEDAGÓGICO ---

  function showFeedbackModal(title, summary, details, isSuccess = false, isFinal = false) {
    // Limpar alarmes se houver
    audio.stopAlarm();
    
    // Estilizar cabeçalho do modal
    elements.modalTitleBar.className = isSuccess ? "modal-header success" : "modal-header danger";
    elements.modalTitleText.textContent = title;
    elements.modalSummaryText.textContent = summary;
    elements.modalDetailsText.innerHTML = details;
    
    // Ícones do modal
    const iconName = isSuccess ? "check-circle-2" : "alert-triangle";
    elements.modalTitleBar.querySelector(".modal-icon").setAttribute("data-lucide", iconName);
    
    // Estatísticas
    if (isFinal || state.safetyScore <= 0) {
      elements.modalStatsPanel.style.display = "flex";
      elements.modalScore.textContent = state.score;
      elements.modalSafety.textContent = `${state.safetyScore}%`;
      
      elements.btnModalAction.textContent = "Reiniciar Jogo";
      elements.btnModalClose.style.display = "none";
    } else {
      elements.modalStatsPanel.style.display = "none";
      if (isSuccess) {
        elements.btnModalAction.textContent = "Continuar";
        elements.btnModalClose.style.display = "none";
      } else {
        elements.btnModalAction.textContent = "Tentar Novamente";
        elements.btnModalClose.style.display = "inline-flex";
      }
    }
    
    elements.modalFeedback.classList.add("active");
    lucide.createIcons();
  }

  function hideFeedbackModal() {
    elements.modalFeedback.classList.remove("active");
  }

  // Ações do botão do modal
  elements.btnModalAction.addEventListener("click", () => {
    hideFeedbackModal();
    audio.playClick();
    
    const actionText = elements.btnModalAction.textContent;
    
    if (actionText === "Reiniciar Jogo" || state.safetyScore <= 0) {
      resetGame();
    } else if (actionText === "Continuar") {
      // Avançar para a próxima fase
      goToPhase(state.currentPhase + 1);
    } else if (actionText === "Tentar Novamente") {
      // Reiniciar a fase atual
      restartPhase(state.currentPhase);
    }
  });

  elements.btnModalClose.addEventListener("click", () => {
    hideFeedbackModal();
    audio.playClick();
  });

  // Mostrar / Fechar Resumo de Regras
  elements.btnShowRules.addEventListener("click", () => {
    elements.modalRules.classList.add("active");
    audio.playClick();
  });

  elements.btnCloseRules.addEventListener("click", () => {
    elements.modalRules.classList.remove("active");
    audio.playClick();
  });

  // Reiniciar Jogo do Rodapé
  elements.btnResetGame.addEventListener("click", () => {
    if (confirm("Deseja realmente reiniciar o treinamento? Todo o progresso será perdido.")) {
      resetGame();
    }
  });

  // --- F. SISTEMA DE NAVEGAÇÃO DE FASES ---

  function goToPhase(phaseNum) {
    state.currentPhase = phaseNum;
    
    // Atualizar HUD steps
    for (let i = 1; i <= 5; i++) {
      const step = document.getElementById(`step-${i}`);
      step.className = "stage-step";
      if (i < phaseNum) step.classList.add("completed");
      if (i === phaseNum) step.classList.add("active");
    }
    
    // Ocultar TODAS as telas (inclui teoria e simulador de equipe) e ativar a correta
    document.querySelectorAll(".viewport-screen").forEach(s => s.classList.remove("active"));
    audio.stopAlarm();
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (phaseNum === 0) {
      elements.screens.intro.classList.add("active");
    } else if (phaseNum === 1) {
      elements.screens.phase1.classList.add("active");
      initPhase1();
    } else if (phaseNum === 2) {
      elements.screens.phase2.classList.add("active");
      initPhase2();
    } else if (phaseNum === 3) {
      elements.screens.phase3.classList.add("active");
      initPhase3();
    } else if (phaseNum === 4) {
      elements.screens.phase4.classList.add("active");
      initPhase4();
    } else if (phaseNum === 5) {
      elements.screens.phase5.classList.add("active");
      initPhase5();
    }
  }

  function restartPhase(phaseNum) {
    if (phaseNum === 1) {
      state.phase1.foundHazards = [];
      document.querySelectorAll("#phase1-scene .scene-object").forEach(o => o.classList.remove("found", "checked-ok", "hint-flash"));
      document.querySelectorAll(".hazard-item").forEach(i => i.classList.remove("found"));
      const hintBtn = document.getElementById("btn-hint-phase1");
      if (hintBtn) hintBtn.classList.remove("disabled");
      elements.btnNextPhase1.classList.add("disabled");
      initPhase1();
    } else if (phaseNum === 2) {
      state.phase2.selectedEquip = [];
      state.phase2.powerOn = false;
      state.phase2.calibrated = false;
      state.phase2.isCalibrating = false;
      document.querySelectorAll(".equip-card").forEach(c => c.classList.remove("selected"));
      elements.calibrationBox.classList.add("locked");
      elements.calibrationLockText.style.display = "flex";
      resetDetectorScreen();
      elements.btnNextPhase2.classList.add("disabled");
      initPhase2();
    } else if (phaseNum === 3) {
      state.phase3.measuredLevels = { top: false, mid: false, bottom: false };
      state.phase3.ventilationOn = false;
      state.phase3.gasesClean = false;
      state.phase3.probeDepth = 0;
      probeCtl.samplingProgress = 0;
      probeCtl.samplingZone = null;
      updateProbePosition(0);

      ["top", "mid", "bottom"].forEach(z => {
        const status = document.getElementById(`status-${z}`);
        if (status) { status.textContent = "Pendente"; status.className = "layer-status"; }
      });

      elements.checkTop.className = "check-item";
      elements.checkMid.className = "check-item";
      elements.checkBottom.className = "check-item";
      
      state.phase3.isAirCleaning = false;
      if (state.phase3.cleanTimer) clearTimeout(state.phase3.cleanTimer);
      elements.fanIcon.className = "fan-icon-class";
      elements.ventilationText.textContent = "Desligado - Risco de asfixia e explosão no fundo.";
      elements.btnToggleFan.textContent = "Ligar Exaustor / Insuflador";
      elements.btnToggleFan.classList.remove("disabled");

      // Resetar camadas
      document.getElementById("layer-top").classList.remove("gas-clear");
      document.getElementById("layer-mid").classList.remove("gas-clear");
      document.getElementById("layer-bottom").classList.remove("gas-clear");
      
      elements.btnNextPhase3.classList.add("disabled");
      initPhase3();
    } else if (phaseNum === 4) {
      state.phase4.checklistChecked = { LOTO: false, vent: false, ppe: false, rescue: false, vigia: false };
      state.phase4.signed = { supervisor: false, vigia: false };
      
      elements.petCheckboxes.forEach(cb => cb.checked = false);
      elements.signatureSlots.forEach(slot => {
        slot.className = "slot-dropzone";
        slot.textContent = "Solte o carimbo/assinatura aqui";
      });
      document.querySelectorAll(".drag-signature").forEach(stamp => stamp.style.opacity = "1");
      
      elements.btnNextPhase4.classList.add("disabled");
      initPhase4();
    } else if (phaseNum === 5) {
      stopMonitoring();
      initPhase5();
    }
  }

  function resetGame() {
    state.score = 0;
    state.safetyScore = 100;
    elements.scoreDisplay.textContent = "0";
    elements.safetyPercent.textContent = "100%";
    elements.safetyBarFill.style.width = "100%";
    elements.safetyBarFill.style.backgroundColor = "var(--color-safety-green)";
    
    // Resetar tudo e voltar pro menu inicial
    restartPhase(1);
    restartPhase(2);
    restartPhase(3);
    restartPhase(4);
    restartPhase(5);
    
    goToPhase(0);
    showToast("Simulador reiniciado com sucesso!", "success");
  }

  function triggerGameOver(title, summary, rulesHtml) {
    audio.playFailure();
    showFeedbackModal(title, summary, rulesHtml, false);
  }

  // --- G. FASE 1: INSPEÇÃO DE RISCOS ---

  function updatePhase1Counter() {
    const counter = document.getElementById("phase1-counter");
    if (counter) counter.textContent = `${state.phase1.foundHazards.length} / 4`;
  }

  function initPhase1() {
    // Recriar objetos de cena para limpar listeners antigos
    document.querySelectorAll("#phase1-scene .scene-object").forEach(obj => {
      obj.replaceWith(obj.cloneNode(true));
    });
    updatePhase1Counter();
    lucide.createIcons();

    const HAZARD_NAMES = {
      valve: "Válvula aberta sem raquete de bloqueio!",
      sign: "Suporte de placa VAZIO — falta sinalização!",
      cable: "Painel energizado com cabos expostos!",
      waste: "Resíduo químico não drenado no fundo!"
    };

    document.querySelectorAll("#phase1-scene .scene-object").forEach(obj => {
      obj.addEventListener("click", () => {
        const hazard = obj.getAttribute("data-hazard");
        const safeItem = obj.getAttribute("data-safe");

        // Item de distração (não é risco): mensagem de erro + pequena penalidade
        if (safeItem) {
          if (obj.classList.contains("checked-ok")) return; // já clicado
          audio.playFailure();
          obj.classList.add("checked-ok", "shake");
          setTimeout(() => obj.classList.remove("shake"), 400);
          state.score = Math.max(0, state.score - 10);
          elements.scoreDisplay.textContent = state.score;
          const DISTRACT_MSG = {
            toolbox: "❌ Errado! Uma caixa de ferramentas NÃO é uma irregularidade da NR 33.",
            light: "❌ Errado! Uma luminária de área em bom estado não é um risco a registrar.",
            cone: "❌ Errado! O cone de sinalização está correto — não é uma violação.",
            tripe: "❌ Errado! O tripé de resgate montado está CONFORME — não é um risco."
          };
          showToast((DISTRACT_MSG[safeItem] || "❌ Este item não é uma irregularidade.") + " (-10 pts)", "danger");
          return;
        }

        if (!hazard || state.phase1.foundHazards.includes(hazard)) return;

        audio.playSuccess();
        obj.classList.add("found");
        state.phase1.foundHazards.push(hazard);
        updatePhase1Counter();

        // Revelar item na lista lateral
        const item = document.getElementById(`item-${hazard}`);
        if (item) item.classList.add("found");

        addPoints(50);
        showToast(`🚨 ${HAZARD_NAMES[hazard]} +50pts`, "success");

        // Checar se encontrou todos (4 no total)
        if (state.phase1.foundHazards.length === 4) {
          addPoints(100); // Bônus de fase
          audio.playSuccess();
          elements.btnNextPhase1.classList.remove("disabled");
          const hintBtn = document.getElementById("btn-hint-phase1");
          if (hintBtn) hintBtn.classList.add("disabled");
          showToast("Fase 1 Concluída! Bônus +100pts", "success");
        }
      });
    });

    // Botão de dica: pisca um risco ainda não encontrado
    const hintBtn = document.getElementById("btn-hint-phase1");
    if (hintBtn) {
      const freshHint = hintBtn.cloneNode(true);
      hintBtn.replaceWith(freshHint);
      lucide.createIcons();
      freshHint.addEventListener("click", () => {
        const remaining = ["valve", "sign", "cable", "waste"].filter(h => !state.phase1.foundHazards.includes(h));
        if (remaining.length === 0) return;
        audio.playBeep(900, 0.15);
        state.score = Math.max(0, state.score - 25);
        elements.scoreDisplay.textContent = state.score;
        const target = document.querySelector(`#phase1-scene .scene-object[data-hazard="${remaining[0]}"]`);
        if (target) {
          target.classList.add("hint-flash");
          setTimeout(() => target.classList.remove("hint-flash"), 2400);
        }
        showToast("💡 Dica usada (-25 pts): observe o item destacado!", "info");
      });
    }
  }

  elements.btnNextPhase1.addEventListener("click", () => {
    if (elements.btnNextPhase1.classList.contains("disabled")) return;
    audio.playClick();
    goToPhase(2);
  });

  // --- H. FASE 2: EQUIPAMENTOS E CALIBRAÇÃO ---

  function initPhase2() {
    elements.equipCards.forEach(card => {
      card.replaceWith(card.cloneNode(true));
    });
    
    elements.equipCards = document.querySelectorAll(".equip-card");
    
    elements.equipCards.forEach(card => {
      card.addEventListener("click", () => {
        const equip = card.getAttribute("data-equip");
        const isRequired = card.getAttribute("data-required") === "true";
        const isSelected = state.phase2.selectedEquip.includes(equip);
        
        audio.playClick();
        
        if (isSelected) {
          // Deselecionar
          state.phase2.selectedEquip = state.phase2.selectedEquip.filter(e => e !== equip);
          card.classList.remove("selected");
          
          if (equip === "detector") {
            // Trancar calibração
            elements.calibrationBox.classList.add("locked");
            elements.calibrationLockText.style.display = "flex";
            state.phase2.powerOn = false;
            state.phase2.calibrated = false;
            resetDetectorScreen();
          }
        } else {
          // Selecionar
          if (isRequired) {
            state.phase2.selectedEquip.push(equip);
            card.classList.add("selected");
            addPoints(20);
            
            // Destrancar calibração do detector
            if (equip === "detector") {
              elements.calibrationBox.classList.remove("locked");
              elements.calibrationLockText.style.display = "none";
            }
          } else {
            // Item Incorreto / Penalidade
            const penalty = card.getAttribute("data-penalty") === "true";
            if (penalty) {
              if (equip === "simplemask") {
                showFeedbackModal(
                  "Equipamento Inadequado!",
                  "A máscara cirúrgica/poeira não protege contra gases tóxicos ou asfixia.",
                  "<strong>NR 33:</strong> Em atmosferas com deficiência de oxigênio (< 19.5%) ou presença de gases tóxicos (H₂S, CO), máscaras comuns de poeira são inúteis. É necessário respirador autônomo (SCBA) ou sistema de linha de ar mandado.",
                  false
                );
                applyPenalty(15);
              } else if (equip === "flashlight") {
                showFeedbackModal(
                  "Perigo de Explosão!",
                  "Lanternas comuns podem causar centelhas e ignição elétrica.",
                  "<strong>NR 33:</strong> Equipamentos eletrônicos (como lanternas e rádios) devem ter certificação de <strong>Segurança Intrínseca (Ex)</strong>. Lanternas comuns geram pequenas faíscas ao serem ligadas, o que pode detonar gases explosivos como o metano dentro do tanque.",
                  false
                );
                applyPenalty(20);
              }
            }
          }
        }
        
        checkPhase2Requirements();
      });
    });
  }

  function checkPhase2Requirements() {
    const required = ["detector", "tripod", "ventilator", "harness", "radio", "scba"];
    const hasAllEquip = required.every(e => state.phase2.selectedEquip.includes(e));
    
    if (hasAllEquip && state.phase2.calibrated) {
      elements.btnNextPhase2.classList.remove("disabled");
    } else {
      elements.btnNextPhase2.classList.add("disabled");
    }
  }

  // --- DETECTOR DE GÁS LÓGICA ---
  function resetDetectorScreen() {
    elements.detMsg.textContent = "OFF";
    elements.detO2.textContent = "--.-";
    elements.detLel.textContent = "---";
    elements.detCo.textContent = "---";
    elements.detH2s.textContent = "---";
    elements.btnDetCal.classList.add("disabled");
  }

  elements.btnDetPower.addEventListener("click", () => {
    if (elements.calibrationBox.classList.contains("locked")) return;
    audio.playClick();
    
    state.phase2.powerOn = !state.phase2.powerOn;
    
    if (state.phase2.powerOn) {
      elements.detMsg.textContent = "INICIALIZANDO...";
      audio.playBeep(2000, 0.1);
      setTimeout(() => this.playBeep(2000, 0.1), 150);
      
      setTimeout(() => {
        if (!state.phase2.powerOn) return;
        elements.detMsg.textContent = "CALIBRE NECESS.";
        elements.detO2.textContent = "18.4";
        elements.detLel.textContent = "22";
        elements.detCo.textContent = "15";
        elements.detH2s.textContent = "8";
        elements.btnDetCal.classList.remove("disabled");
        audio.startAlarm(); // Alarme apitando devido a leituras incorretas
      }, 1500);
    } else {
      audio.stopAlarm();
      resetDetectorScreen();
    }
  });

  elements.btnDetCal.addEventListener("click", () => {
    if (!state.phase2.powerOn || state.phase2.isCalibrating || state.phase2.calibrated) return;
    audio.playClick();
    audio.stopAlarm();
    
    state.phase2.isCalibrating = true;
    elements.detMsg.textContent = "AUTO CAL...";
    elements.detO2.textContent = "CAL";
    elements.detLel.textContent = "CAL";
    elements.detCo.textContent = "CAL";
    elements.detH2s.textContent = "CAL";
    
    // Pequeno processo de 3 segundos
    let seconds = 3;
    const interval = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(interval);
        state.phase2.isCalibrating = false;
        state.phase2.calibrated = true;
        
        elements.detMsg.textContent = "OK - AR LIMPO";
        elements.detO2.textContent = "20.9";
        elements.detLel.textContent = "0";
        elements.detCo.textContent = "0";
        elements.detH2s.textContent = "0";
        
        audio.playSuccess();
        addPoints(100);
        showToast("Detector Calibrado! +100pts", "success");
        checkPhase2Requirements();
      } else {
        audio.playBeep(1000, 0.05);
      }
    }, 1000);
  });

  elements.btnNextPhase2.addEventListener("click", () => {
    if (elements.btnNextPhase2.classList.contains("disabled")) return;
    audio.playClick();
    goToPhase(3);
  });

  // --- I. FASE 3: MEDIÇÃO ATMOSFÉRICA ---

  // --- SONDA ARRASTÁVEL (Fase 3) ---
  const probeCtl = {
    dragging: false,
    lastMoveTime: 0,
    samplingProgress: 0,
    samplingZone: null,
    samplerInterval: null
  };

  function getZoneForDepth(pct) {
    if (pct < 8) return null; // fora do tanque / boca
    if (pct <= 36) return "top";
    if (pct <= 68) return "mid";
    return "bottom";
  }

  function initPhase3() {
    updateGasReadings(0);
    updateProbePosition(state.phase3.probeDepth || 0);

    const tank = document.getElementById("tank-cutaway");
    const probeHead = elements.probeHead;
    if (!tank || !probeHead) return;

    // ---- Arrastar a sonda (mouse e toque, via Pointer Events) ----
    // Recriar o probe-head limpo (evita listeners duplicados ao reiniciar)
    const freshProbe = probeHead.cloneNode(true);
    probeHead.replaceWith(freshProbe);
    elements.probeHead = freshProbe;
    lucide.createIcons();

    elements.probeHead.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      probeCtl.dragging = true;
      elements.probeHead.classList.add("dragging");
      audio.playClick();
    });

    // Listeners globais registrados apenas uma vez
    if (!probeCtl.globalListenersAttached) {
      probeCtl.globalListenersAttached = true;

      window.addEventListener("pointermove", (e) => {
        if (!probeCtl.dragging) return;
        const tankNow = document.getElementById("tank-cutaway");
        if (!tankNow) return;
        const rect = tankNow.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const pct = Math.max(0, Math.min(100, (y / rect.height) * 100));
        state.phase3.probeDepth = pct;
        probeCtl.lastMoveTime = Date.now();
        updateProbePosition(pct);
        updateGasReadings(pct); // leitura ao vivo conforme a profundidade
      });

      window.addEventListener("pointerup", () => {
        if (!probeCtl.dragging) return;
        probeCtl.dragging = false;
        elements.probeHead.classList.remove("dragging");
        probeCtl.lastMoveTime = Date.now();
      });
    }

    // ---- Clique em uma camada move a sonda até o centro dela ----
    const zoneCenters = { top: 22, mid: 52, bottom: 84 };
    document.querySelectorAll("#tank-cutaway .tank-layer").forEach(layer => {
      const freshLayer = layer.cloneNode(true);
      layer.replaceWith(freshLayer);
    });
    lucide.createIcons();
    document.querySelectorAll("#tank-cutaway .tank-layer").forEach(layer => {
      layer.addEventListener("click", () => {
        const level = layer.getAttribute("data-level");
        if (!level) return;
        audio.playClick();
        state.phase3.probeDepth = zoneCenters[level];
        probeCtl.lastMoveTime = Date.now() - 300; // amostragem inicia rápido
        updateProbePosition(state.phase3.probeDepth);
        updateGasReadings(state.phase3.probeDepth);
      });
    });

    // ---- Amostrador automático: sonda parada dentro de uma zona = coleta ----
    if (probeCtl.samplerInterval) clearInterval(probeCtl.samplerInterval);
    probeCtl.samplerInterval = setInterval(() => {
      if (state.currentPhase !== 3) return;

      const pct = state.phase3.probeDepth || 0;
      const zone = getZoneForDepth(pct);
      const ring = document.getElementById("sampling-ring");
      const fill = document.getElementById("sampling-fill");
      if (!ring || !fill) return;

      const stationary = !probeCtl.dragging && (Date.now() - probeCtl.lastMoveTime > 350);
      const zoneAlreadyMeasured = zone && state.phase3.measuredLevels[zone];

      if (zone && !zoneAlreadyMeasured && stationary) {
        // Progresso de coleta (1.6s no total; tick a cada 80ms)
        if (probeCtl.samplingZone !== zone) {
          probeCtl.samplingZone = zone;
          probeCtl.samplingProgress = 0;
          const status = document.getElementById(`status-${zone}`);
          if (status) { status.textContent = "Coletando..."; status.className = "layer-status sampling"; }
        }
        probeCtl.samplingProgress += 5;
        ring.classList.add("active");
        fill.style.width = `${Math.min(100, probeCtl.samplingProgress)}%`;
        if (probeCtl.samplingProgress % 25 === 0) { try { audio.playBeep(1400, 0.04); } catch (e) {} }

        if (probeCtl.samplingProgress >= 100) {
          // Amostra coletada!
          probeCtl.samplingProgress = 0;
          probeCtl.samplingZone = null;
          ring.classList.remove("active");
          fill.style.width = "0%";
          const zonePctMap = { top: 20, mid: 50, bottom: 85 };

          // Marcar o nível como medido
          state.phase3.measuredLevels[zone] = true;
          const status = document.getElementById(`status-${zone}`);
          if (status) { status.textContent = "✓ Medido"; status.className = "layer-status done"; }
          const checkEl = zone === "top" ? elements.checkTop : zone === "mid" ? elements.checkMid : elements.checkBottom;
          const label = zone === "top" ? "Topo" : zone === "mid" ? "Meio" : "Fundo";
          if (checkEl) { checkEl.className = "check-item done"; checkEl.innerHTML = `<i data-lucide="check-circle"></i> Teste no ${label}`; }

          // Renderiza a leitura da zona amostrada
          updateGasReadings(zonePctMap[zone]);
          addPoints(50);

          const prof = gasProfile(zonePctMap[zone]);
          try {
            if (prof.unsafe) audio.playFailure(); else audio.playSuccess();
          } catch (e) {}
          if (prof.unsafe) {
            showToast(`🚨 FUNDO INSEGURO! H₂S ${prof.h2s}ppm, O₂ ${prof.o2}%. Ligue o exaustor para purgar!`, "danger");
          } else {
            showToast(`✅ ${label.toUpperCase()}: atmosfera segura. +50pts`, "success");
          }
        }
      } else {
        // Reset do progresso se mover ou sair da zona
        if (probeCtl.samplingZone && (!zone || zone !== probeCtl.samplingZone || !stationary)) {
          const status = document.getElementById(`status-${probeCtl.samplingZone}`);
          if (status && !state.phase3.measuredLevels[probeCtl.samplingZone]) {
            status.textContent = "Pendente";
            status.className = "layer-status";
          }
          probeCtl.samplingZone = null;
        }
        probeCtl.samplingProgress = 0;
        ring.classList.remove("active");
        fill.style.width = "0%";
      }
    }, 80);
  }

  function updateProbePosition(percentage) {
    const tank = document.getElementById("tank-cutaway");
    const tankH = tank ? tank.clientHeight : 260;
    const maxY = Math.max(60, tankH - 46); // margem para a cabeça da sonda
    const currentY = Math.max(20, (percentage / 100) * maxY);

    elements.probeCable.style.height = `${currentY}px`;
    elements.probeHead.style.top = `${currentY}px`;

    // Medidor de profundidade (tanque simulado de 6 metros)
    const depthValue = document.getElementById("depth-value");
    if (depthValue) depthValue.textContent = `${((percentage / 100) * 6).toFixed(1).replace(".", ",")} m`;

    // Destaque da camada onde a sonda está
    const zone = getZoneForDepth(percentage);
    ["top", "mid", "bottom"].forEach(z => {
      const layer = document.getElementById(`layer-${z}`);
      if (layer) layer.classList.toggle("probe-inside", z === zone);
    });
  }

  // Perfil de gases por profundidade: TOPO e MEIO seguros, apenas o FUNDO é inseguro
  function gasProfile(percentage) {
    const zone = getZoneForDepth(percentage);
    // Após a ventilação/purga, todos os níveis ficam seguros
    if (state.phase3.gasesClean) return { o2: 20.9, lel: 0, co: 0, h2s: 0, unsafe: false, zone };
    if (zone === "bottom") {
      // Gases pesados acumulados no fundo (H₂S) + deficiência de O₂
      return { o2: 17.2, lel: 3, co: 15, h2s: 24, unsafe: true, zone };
    }
    // Topo e meio: atmosfera segura
    return { o2: 20.9, lel: 0, co: 0, h2s: 0, unsafe: false, zone };
  }

  // Renderiza o visor do detector (NÃO marca nível como medido — isso é feito pelo amostrador)
  function updateGasReadings(percentage) {
    const p = gasProfile(percentage);

    const cellO2 = document.getElementById("live-cell-o2");
    const cellLel = document.getElementById("live-cell-lel");
    const cellCo = document.getElementById("live-cell-co");
    const cellH2s = document.getElementById("live-cell-h2s");
    if (cellO2) cellO2.className = p.o2 < 19.5 ? "live-cell gas-danger" : "live-cell";
    if (cellLel) cellLel.className = p.lel > 10 ? "live-cell gas-danger" : "live-cell";
    if (cellCo) cellCo.className = p.co > 39 ? "live-cell gas-danger" : "live-cell";
    if (cellH2s) cellH2s.className = p.h2s > 8 ? "live-cell gas-danger" : "live-cell";

    if (p.unsafe) {
      elements.gasAlertStrip.className = "detector-alert-strip alarm";
      elements.gasAlertStrip.textContent = "⚠ ATMOSFERA INSEGURA NO FUNDO! H₂S alto e O₂ baixo. LIGUE O EXAUSTOR para purgar o tanque.";
      audio.startAlarm();
    } else {
      elements.gasAlertStrip.className = "detector-alert-strip safe";
      if (state.phase3.gasesClean) {
        elements.gasAlertStrip.textContent = "✅ ATMOSFERA PURGADA E SEGURA EM TODOS OS NÍVEIS";
      } else if (p.zone) {
        elements.gasAlertStrip.textContent = "ATMOSFERA SEGURA NESTE NÍVEL";
      } else {
        elements.gasAlertStrip.textContent = "AGUARDANDO MEDIÇÃO...";
      }
      audio.stopAlarm();
    }

    elements.liveO2.textContent = `${p.o2}%`;
    elements.liveLel.textContent = `${p.lel}%`;
    elements.liveCo.textContent = `${p.co} ppm`;
    elements.liveH2s.textContent = `${p.h2s} ppm`;

    lucide.createIcons();
    checkPhase3Requirements();
  }

  // Lógica de Ligar Ventilação (uma vez ligado, purga o tanque inteiro e permanece limpo)
  elements.btnToggleFan.addEventListener("click", () => {
    // Já purgado ou purgando: não faz nada
    if (state.phase3.gasesClean || state.phase3.isAirCleaning) return;

    // Exige medir o fundo antes (é lá que está o risco)
    if (!state.phase3.measuredLevels.bottom) {
      audio.playFailure();
      showToast("⚠ Meça primeiro o FUNDO do tanque para confirmar a necessidade de ventilação!", "warning");
      return;
    }

    audio.playClick();
    state.phase3.ventilationOn = true;
    state.phase3.isAirCleaning = true;
    elements.fanIcon.classList.add("spinning");
    elements.btnToggleFan.textContent = "Purgando atmosfera...";
    elements.btnToggleFan.classList.add("disabled");
    elements.ventilationText.textContent = "Ligado — o ar contaminado do fundo está sendo trocado em todo o tanque...";
    showToast("💨 Exaustor ligado! Purgando o tanque...", "info");

    state.phase3.cleanTimer = setTimeout(() => {
      state.phase3.isAirCleaning = false;
      state.phase3.gasesClean = true;

      elements.btnToggleFan.textContent = "✓ Exaustor Ligado (Atmosfera Limpa)";
      elements.ventilationText.textContent = "Atmosfera purgada e segura em todos os níveis. Mantenha o exaustor ligado durante o trabalho.";

      // Todo o tanque agora está limpo
      document.getElementById("layer-top").classList.add("gas-clear");
      document.getElementById("layer-mid").classList.add("gas-clear");
      document.getElementById("layer-bottom").classList.add("gas-clear");

      updateGasReadings(state.phase3.probeDepth);
      addPoints(100);
      showToast("✅ Ar renovado e seguro em todos os níveis! +100pts", "success");
      checkPhase3Requirements();
    }, 4000);
  });

  function checkPhase3Requirements() {
    const hasAllMeasured = state.phase3.measuredLevels.top && state.phase3.measuredLevels.mid && state.phase3.measuredLevels.bottom;
    const isAirClean = state.phase3.gasesClean;
    
    if (hasAllMeasured && isAirClean) {
      elements.btnNextPhase3.classList.remove("disabled");
    } else {
      elements.btnNextPhase3.classList.add("disabled");
    }
  }

  elements.btnNextPhase3.addEventListener("click", () => {
    if (elements.btnNextPhase3.classList.contains("disabled")) return;
    audio.playClick();
    goToPhase(4);
  });

  // --- J. FASE 4: EMISSÃO DA PET ---

  function initPhase4() {
    // 1. Escrever dados salvos da Fase 3 na PET
    elements.petGasO2.textContent = "20.9 %";
    elements.petGasLel.textContent = "0 %";
    elements.petGasCo.textContent = "0 ppm";
    elements.petGasH2s.textContent = "0 ppm";
    
    elements.petStatusO2.textContent = "Aprovado";
    elements.petStatusO2.style.color = "var(--color-safety-green)";
    elements.petStatusLel.textContent = "Aprovado";
    elements.petStatusLel.style.color = "var(--color-safety-green)";
    elements.petStatusCo.textContent = "Aprovado";
    elements.petStatusCo.style.color = "var(--color-safety-green)";
    elements.petStatusH2s.textContent = "Aprovado";
    elements.petStatusH2s.style.color = "var(--color-safety-green)";

    // 2. Configurar drag & drop de carimbos
    elements.dragStamps.forEach(stamp => {
      stamp.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", stamp.getAttribute("data-role"));
        state.phase4.selectedSign = stamp.getAttribute("data-role");
      });
      
      // Adicionar clique como fallback para mobile e simplicidade
      stamp.addEventListener("click", () => {
        audio.playClick();
        state.phase4.selectedSign = stamp.getAttribute("data-role");
        
        // Destacar carimbo selecionado
        elements.dragStamps.forEach(s => s.style.borderColor = "var(--color-border)");
        stamp.style.borderColor = "var(--color-alert-yellow)";
        showToast("Carimbo selecionado! Clique no espaço correspondente da PET para assinar.", "info");
      });
    });

    elements.signatureSlots.forEach(slot => {
      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        const role = e.dataTransfer.getData("text/plain");
        applySignature(role, slot);
      });
      
      // Clique como fallback
      slot.addEventListener("click", () => {
        if (state.phase4.selectedSign === slot.parentNode.getAttribute("data-role")) {
          applySignature(state.phase4.selectedSign, slot);
        } else if (state.phase4.selectedSign) {
          showToast("A assinatura selecionada não condiz com este cargo!", "warning");
        }
      });
    });

    // Checklist checkboxes
    elements.petCheckboxes.forEach(cb => {
      cb.replaceWith(cb.cloneNode(true));
    });
    elements.petCheckboxes = document.querySelectorAll(".pet-checkbox");

    elements.petCheckboxes.forEach(cb => {
      cb.addEventListener("change", () => {
        audio.playClick();
        checkPhase4Requirements();
      });
    });
  }

  function applySignature(role, slot) {
    const expectedRole = slot.parentNode.getAttribute("data-role");
    
    if (role === expectedRole) {
      audio.playSuccess();
      slot.classList.add("signed");
      slot.textContent = `Carimbado por ${role.toUpperCase()}`;
      
      state.phase4.signed[role] = true;
      
      // Sumir elemento arrastável original
      const stampElement = document.getElementById(`drag-stamp-${role}`);
      if (stampElement) stampElement.style.opacity = "0.3";
      
      addPoints(50);
      showToast("Assinado com sucesso!", "success");
      
      state.phase4.selectedSign = null; // Resetar
      checkPhase4Requirements();
    } else {
      showToast("Você soltou a assinatura no cargo errado!", "danger");
    }
  }

  function checkPhase4Requirements() {
    const checks = Array.from(elements.petCheckboxes).every(cb => cb.checked);
    const signedAll = state.phase4.signed.supervisor && state.phase4.signed.vigia;
    
    if (checks && signedAll) {
      elements.btnNextPhase4.classList.remove("disabled");
    } else {
      elements.btnNextPhase4.classList.add("disabled");
    }
  }

  elements.btnNextPhase4.addEventListener("click", () => {
    if (elements.btnNextPhase4.classList.contains("disabled")) return;
    audio.playClick();
    goToPhase(5);
  });

  // --- K. FASE 5: VIGILÂNCIA ATIVA (MONITORAMENTO) ---

  function initPhase5() {
    // Resetar botões e visor
    elements.btnStartMonitoring.style.display = "inline-flex";
    elements.btnStartMonitoring.disabled = false;
    
    disableVigilaButtons();
    
    elements.workerAvatar.className = "worker-avatar-confinement";
    elements.workerStatusTag.textContent = "Aguardando...";
    elements.telHeartRate.textContent = "80 bpm";
    elements.telO2.textContent = "20.9%";
    elements.telTimer.textContent = "00:45";
    elements.telRadioStatus.textContent = "OFFLINE";
    
    elements.eventBox.className = "alert-event-box blinking-alert";
    elements.eventTitleText.textContent = "Aguardando Início do Monitoramento...";
    elements.eventDescText.textContent = "Clique em 'Iniciar Monitoramento' para começar a simulação do trabalho do colaborador lá dentro.";
  }

  function disableVigilaButtons() {
    elements.btnActionEvacuate.disabled = true;
    elements.btnActionRescue.disabled = true;
    elements.btnActionRadio.disabled = true;
    elements.btnActionIntervene.disabled = true;
    elements.btnActionEnter.disabled = true;
  }

  function enableVigilaButtons() {
    elements.btnActionEvacuate.disabled = false;
    elements.btnActionRescue.disabled = false;
    elements.btnActionRadio.disabled = false;
    elements.btnActionIntervene.disabled = false;
    elements.btnActionEnter.disabled = false;
  }

  elements.btnStartMonitoring.addEventListener("click", () => {
    audio.playClick();
    elements.btnStartMonitoring.style.display = "none";
    
    state.phase5.isMonitoring = true;
    state.phase5.timeElapsed = 0;
    
    elements.workerStatusTag.textContent = "Trabalhando...";
    elements.workerStatusTag.style.color = "var(--color-safety-green)";
    elements.telRadioStatus.textContent = "FORTE";
    
    enableVigilaButtons();
    
    // Iniciar Intervalo do Cronômetro
    const totalTime = 45; // 45 segundos de fase
    
    state.phase5.timerInterval = setInterval(() => {
      state.phase5.timeElapsed++;
      const remaining = totalTime - state.phase5.timeElapsed;
      
      // Atualizar exibição
      const min = String(Math.floor(remaining / 60)).padStart(2, '0');
      const sec = String(remaining % 60).padStart(2, '0');
      elements.telTimer.textContent = `${min}:${sec}`;
      
      // Simular variação normal cardíaca
      if (!state.phase5.activeEvent) {
        state.phase5.workerHeartRate = 75 + Math.floor(Math.random() * 10);
        elements.telHeartRate.textContent = `${state.phase5.workerHeartRate} bpm`;
      }
      
      if (remaining <= 0) {
        winGame();
      }
    }, 1000);
    
    // Agendar eventos aos: 8s, 20s, 32s
    scheduleEvent(8, 'dizzy');
    scheduleEvent(20, 'gas');
    scheduleEvent(32, 'intruder');
  });

  function scheduleEvent(secondsFromStart, eventType) {
    setTimeout(() => {
      if (!state.phase5.isMonitoring) return;
      triggerVigilaEvent(eventType);
    }, secondsFromStart * 1000);
  }

  function triggerVigilaEvent(type) {
    state.phase5.activeEvent = type;
    
    // Efeitos visuais e sonoros com base no evento
    if (type === 'dizzy') {
      audio.startAlarm();
      elements.eventBox.className = "alert-event-box emergency-alert";
      elements.eventTitleText.textContent = "ALERTA: Trabalhador reclamando de Tontura!";
      elements.eventDescText.textContent = "O colaborador relata pelo rádio estar sentindo tonturas e fraqueza repentinas. Sua frequência cardíaca está subindo rapidamente. O que você faz?";
      
      elements.workerAvatar.classList.add("dizzy");
      elements.workerStatusTag.textContent = "MAL-ESTAR";
      elements.workerStatusTag.style.color = "var(--color-danger-red)";
      elements.telHeartRate.textContent = "120 bpm";
      
      // Timeout se o vigia não fizer nada em 8 segundos
      state.phase5.eventTimer = setTimeout(() => {
        triggerGameOver(
          "Asfixia Crítica!", 
          "O trabalhador desmaiou lá dentro e você não tomou nenhuma atitude a tempo.", 
          "<strong>NR 33:</strong> O Vigia deve monitorar continuamente os trabalhadores. Ao menor sinal de mal-estar, fadiga ou tontura, a saída imediata deve ser ordenada ou o resgate com tripé mecânico deve ser acionado sem demora."
        );
      }, 8000);
      
    } else if (type === 'gas') {
      audio.startAlarm();
      elements.eventBox.className = "alert-event-box emergency-alert";
      elements.eventTitleText.textContent = "ALERTA: Detector dispara Alarme de Gás!";
      elements.eventDescText.textContent = "O sensor do detector multigás do trabalhador acusa pico perigoso de Sulfeto de Hidrogênio (H₂S: 18 ppm) e queda de Oxigênio (O₂: 19.1%). O alarme sonoro soa alto. Qual a ação corretiva imediata?";
      
      elements.telO2.textContent = "19.1%";
      elements.telO2.style.color = "var(--color-danger-red)";
      
      state.phase5.eventTimer = setTimeout(() => {
        triggerGameOver(
          "Asfixia por Gás Tóxico!", 
          "O trabalhador perdeu os sentidos devido ao pico rápido de Sulfeto de Hidrogênio (H₂S).", 
          "<strong>NR 33:</strong> O alarme de gás exige a evacuação imediata. O H₂S é um gás asfixiante químico extremamente letal que paralisa o sistema respiratório em poucos minutos."
        );
      }, 8000);
      
    } else if (type === 'intruder') {
      elements.eventBox.className = "alert-event-box blinking-alert";
      elements.eventTitleText.textContent = "ALERTA: Terceiro tentando acessar o local!";
      elements.eventDescText.textContent = "Um eletricista terceirizado chega com uma maleta e tenta passar pela barreira de isolamento para entrar no tanque sem possuir PET emitida. Qual sua ação?";
      
      state.phase5.eventTimer = setTimeout(() => {
        applyPenalty(30);
        showToast("Penalidade! Você permitiu que um estranho desrespeitasse a área restrita.", "danger");
        resolveActiveEvent();
      }, 8000);
    }
  }

  function resolveActiveEvent() {
    audio.stopAlarm();
    if (state.phase5.eventTimer) clearTimeout(state.phase5.eventTimer);
    state.phase5.activeEvent = null;
    
    // Retornar visor ao normal
    elements.eventBox.className = "alert-event-box";
    elements.eventTitleText.textContent = "Monitoramento Normal";
    elements.eventDescText.textContent = "Nenhuma anomalia no momento. Mantenha o posto.";
    
    elements.workerAvatar.className = "worker-avatar-confinement";
    elements.workerStatusTag.textContent = "Trabalhando...";
    elements.workerStatusTag.style.color = "var(--color-safety-green)";
    elements.telO2.textContent = "20.9%";
    elements.telO2.style.color = "#fff";
    
    addPoints(100);
    showToast("Evento solucionado com sucesso! +100pts", "success");
  }

  // Lógica dos Botões de Ação do Vigia

  // AÇÃO INCORRETA FATAL: Entrar no tanque
  elements.btnActionEnter.addEventListener("click", () => {
    audio.playClick();
    triggerGameOver(
      "Game Over: Falha Crítica do Vigia!",
      "Você ENTROU no espaço confinado para resgatar o colaborador! Isso causou uma tragédia em cadeia.",
      "<strong>Regra de Ouro da NR 33:</strong> O Vigia <strong>NUNCA</strong> deve entrar no espaço confinado sob nenhuma circunstância para socorrer um trabalhador acidentado. Estatísticas mundiais apontam que mais de 60% de todas as mortes em espaços confinados são de socorristas improvisados/vigias que entram para ajudar e acabam sucumbindo aos mesmos gases ou falta de oxigênio. O Vigia deve usar o tripé/guincho mecânico da entrada e chamar a equipe de resgate especializada."
    );
  });

  // AÇÃO CORRETA: Evacuar
  elements.btnActionEvacuate.addEventListener("click", () => {
    audio.playClick();
    if (state.phase5.activeEvent === 'gas') {
      resolveActiveEvent();
    } else {
      // Evacuação desnecessária/Equivocada gera penalidade leve mas não mata
      applyPenalty(10);
      showToast("Falso Alarme! Você ordenou evacuação sem perigo real presente.", "warning");
    }
  });

  // AÇÃO CORRETA: Tripé/Resgate Externo
  elements.btnActionRescue.addEventListener("click", () => {
    audio.playClick();
    if (state.phase5.activeEvent === 'dizzy') {
      resolveActiveEvent();
    } else {
      applyPenalty(15);
      showToast("Ação Inadequada! Acionou o tripé sem necessidade extrema.", "warning");
    }
  });

  // AÇÃO CORRETA: Impedir Acesso
  elements.btnActionIntervene.addEventListener("click", () => {
    audio.playClick();
    if (state.phase5.activeEvent === 'intruder') {
      resolveActiveEvent();
    } else {
      applyPenalty(5);
      showToast("Falso Alarme! Eletricista foi barrado desnecessariamente.", "warning");
    }
  });

  // AÇÃO: Comunicação Backup (Falsa ou utilitário)
  elements.btnActionRadio.addEventListener("click", () => {
    audio.playClick();
    showToast("Comunicação de backup verificada. Nenhum sinal de falha detectado.", "info");
  });

  function stopMonitoring() {
    state.phase5.isMonitoring = false;
    audio.stopAlarm();
    if (state.phase5.timerInterval) clearInterval(state.phase5.timerInterval);
    if (state.phase5.eventTimer) clearTimeout(state.phase5.eventTimer);
  }

  function winGame() {
    stopMonitoring();
    audio.playSuccess();
    
    showFeedbackModal(
      "Treinamento Concluído com Sucesso! 🏆",
      `Parabéns! Você concluiu todos os requisitos da NR 33 com sucesso.`,
      `Você demonstrou controle absoluto sobre:
      <br>• Identificação visual de conformidades estruturais;
      <br>• Calibração de detectores e seleção adequada de EPIs;
      <br>• Realização de teste atmosférico e ventilação mecânica forçada;
      <br>• Preenchimento e assinaturas da Permissão de Trabalho (PET);
      <br>• Regra de Ouro do Vigia: Não entrar no tanque e operar o resgate mecânico externo de fora.
      <br><br>Você é um profissional capacitado para atuar como multiplicador da cultura de segurança!`,
      true,
      true
    );
  }

  // ============================================================
  // MÓDULO TEÓRICO
  // ============================================================
  const THEORY_CARDS = [
    { icon: "box", titulo: "O que é Espaço Confinado?", texto: "Área não projetada para ocupação humana contínua, com meios limitados de entrada/saída e ventilação insuficiente, onde pode haver deficiência ou excesso de oxigênio e contaminantes. Ex.: tanques, silos, galerias, poços." },
    { icon: "wind", titulo: "Riscos Atmosféricos", texto: "Os três principais: deficiência de O₂ (<20,9%), atmosfera inflamável (gases/vapores acima de 10% do LEL) e gases tóxicos (H₂S, CO). A medição deve ser feita no topo, meio e fundo antes de qualquer entrada." },
    { icon: "users", titulo: "Os 3 Papéis Obrigatórios", texto: "Supervisor de Entrada (emite e cancela a PET), Vigia (fica FORA monitorando e aciona o resgate) e Trabalhador Autorizado (executa a tarefa dentro). Cada um tem responsabilidades legais definidas." },
    { icon: "file-check", titulo: "PET — Permissão de Trabalho", texto: "Documento escrito, datado e assinado, válido para cada entrada. Lista todas as medidas de controle: bloqueio de energia (LOTO), ventilação, EPIs, equipe de resgate montada e monitoramento contínuo." },
    { icon: "shield-alert", titulo: "Regra de Ouro do Vigia", texto: "O Vigia NUNCA entra no espaço para socorrer. Mais de 60% das mortes em espaços confinados são de socorristas improvisados. Ele deve acionar o resgate e operar o tripé/guincho de FORA." },
    { icon: "life-buoy", titulo: "Resgate e Emergência", texto: "A empresa deve ter plano e equipe de resgate treinada, com tripé, guincho e cinto tipo paraquedista conectado à linha de vida. O tempo de resposta é vital: a asfixia por H₂S ou falta de O₂ ocorre em minutos." }
  ];

  const THEORY_QUIZ = [
    { q: "Qual profissional NUNCA deve entrar no espaço confinado para resgatar um colega?", opts: ["Trabalhador Autorizado", "O Vigia", "Supervisor de Entrada"], correct: 1,
      exp: "O Vigia permanece sempre fora e aciona a equipe de resgate. Entrar seria uma segunda vítima." },
    { q: "Em quais alturas a atmosfera deve ser medida antes da entrada?", opts: ["Apenas no fundo", "Somente na entrada", "Topo, meio e fundo"], correct: 2,
      exp: "Gases se acumulam em níveis diferentes conforme o peso molecular — por isso mede-se nas 3 alturas." },
    { q: "O que garante legalmente a autorização da entrada?", opts: ["A PET assinada", "Aviso verbal do encarregado", "Placa na parede"], correct: 0,
      exp: "A Permissão de Entrada e Trabalho (PET) é o documento escrito obrigatório, válido para cada entrada." },
    { q: "Qual faixa de oxigênio é considerada segura?", opts: ["Abaixo de 17%", "Entre 19,5% e 23%", "Acima de 25%"], correct: 1,
      exp: "Abaixo de 19,5% há deficiência (risco de asfixia); acima de 23% há enriquecimento (risco de incêndio)." }
  ];

  const theoryState = { read: new Set(), answered: new Set(), correct: 0 };

  function initTheory() {
    theoryState.read.clear();
    theoryState.answered.clear();
    theoryState.correct = 0;

    // Cartões
    const grid = document.getElementById("theory-grid");
    grid.innerHTML = "";
    THEORY_CARDS.forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "theory-card";
      card.innerHTML = `<div class="tc-icon"><i data-lucide="${c.icon}"></i></div>
        <h4>${c.titulo}</h4><p>${c.texto}</p>`;
      card.addEventListener("click", () => {
        if (!theoryState.read.has(i)) {
          theoryState.read.add(i);
          card.classList.add("read");
          audio.playClick();
          checkTheoryDone();
        }
      });
      grid.appendChild(card);
    });

    // Quiz
    const qc = document.getElementById("quiz-container");
    qc.innerHTML = "";
    THEORY_QUIZ.forEach((item, qi) => {
      const div = document.createElement("div");
      div.className = "quiz-q";
      let optsHtml = "";
      item.opts.forEach((o, oi) => {
        optsHtml += `<button class="quiz-opt" data-q="${qi}" data-o="${oi}">${o}</button>`;
      });
      div.innerHTML = `<div class="q-text">${qi + 1}. ${item.q}</div><div class="quiz-opts">${optsHtml}</div>`;
      qc.appendChild(div);
    });

    qc.querySelectorAll(".quiz-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        const qi = +btn.dataset.q, oi = +btn.dataset.o;
        if (theoryState.answered.has(qi)) return;
        theoryState.answered.add(qi);
        const item = THEORY_QUIZ[qi];
        const optsWrap = btn.parentNode;
        optsWrap.querySelectorAll(".quiz-opt").forEach(b => b.disabled = true);
        if (oi === item.correct) {
          btn.classList.add("correct");
          theoryState.correct++;
          addPoints(30);
          audio.playSuccess();
          showToast("✅ Correto! +30pts", "success");
        } else {
          btn.classList.add("wrong");
          optsWrap.querySelectorAll(".quiz-opt")[item.correct].classList.add("correct");
          audio.playFailure();
          showToast("❌ " + item.exp, "danger");
        }
        updateQuizProgress();
        checkTheoryDone();
      });
    });
    updateQuizProgress();
    document.getElementById("btn-theory-done").classList.add("disabled");
    lucide.createIcons();
  }

  function updateQuizProgress() {
    const el = document.getElementById("quiz-progress");
    if (el) el.textContent = `${theoryState.answered.size} / ${THEORY_QUIZ.length}`;
  }

  function checkTheoryDone() {
    const allRead = theoryState.read.size === THEORY_CARDS.length;
    const allAnswered = theoryState.answered.size === THEORY_QUIZ.length;
    const btn = document.getElementById("btn-theory-done");
    if (allRead && allAnswered) {
      btn.classList.remove("disabled");
      if (!btn.dataset.bonus) {
        btn.dataset.bonus = "1";
        addPoints(50);
        showToast("📚 Teoria concluída! Bônus +50pts", "success");
      }
    }
  }

  function showTheory() {
    Object.keys(elements.screens).forEach(k => elements.screens[k].classList.remove("active"));
    document.getElementById("screen-team").classList.remove("active");
    document.getElementById("screen-arcade") && document.getElementById("screen-arcade").classList.remove("active");
    document.getElementById("screen-theory").classList.add("active");
    initTheory();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("btn-skip-theory").addEventListener("click", () => { audio.playClick(); goToPhase(1); });
  document.getElementById("btn-theory-done").addEventListener("click", (e) => {
    if (e.currentTarget.classList.contains("disabled")) return;
    audio.playClick();
    goToPhase(1);
  });

  // ============================================================
  // SIMULADOR 2 — EQUIPE & RESGATE (personagens)
  // ============================================================
  const TEAM_SCENES = [
    {
      title: "Antes da Entrada — Liberação",
      desc: "O Trabalhador quer entrar rápido para adiantar o serviço. O que a equipe deve fazer primeiro?",
      alert: "",
      speaker: "worker", speech: "Vamos logo, é rapidinho!",
      q: "Qual a decisão correta do Supervisor?",
      options: [
        { t: "Liberar a entrada imediatamente para agilizar", ok: false, who: "worker",
          fb: "Nunca! Sem PET e medições, a entrada é ilegal e fatal." },
        { t: "Exigir PET assinada, medição de gases e vigia posicionado", ok: true, who: "supervisor",
          fb: "Correto! Nenhuma entrada ocorre sem PET, atmosfera testada e vigia no posto." }
      ]
    },
    {
      title: "Teste Atmosférico",
      desc: "O detector multigás precisa ser usado antes da entrada.",
      alert: "",
      speaker: "supervisor", speech: "Meça a atmosfera!",
      q: "Como o teste deve ser feito?",
      options: [
        { t: "Medir só na boca do tanque", ok: false, who: "supervisor",
          fb: "Insuficiente. Gases pesados como H₂S ficam no fundo e passariam despercebidos." },
        { t: "Medir no topo, meio e fundo com detector calibrado", ok: true, who: "supervisor",
          fb: "Exato! A amostragem nas 3 alturas detecta gases de diferentes densidades." }
      ]
    },
    {
      title: "Trabalhador em Ação",
      desc: "O Trabalhador entrou com cinto paraquedista conectado. O Vigia assume o posto.",
      alert: "",
      speaker: "vigia", speech: "Estou de olho em você!",
      q: "Qual a função do Vigia neste momento?",
      options: [
        { t: "Entrar junto para ajudar no serviço", ok: false, who: "vigia",
          fb: "Jamais! O Vigia nunca entra — ele monitora de fora o tempo todo." },
        { t: "Permanecer fora, manter comunicação e vigiar sinais de risco", ok: true, who: "vigia",
          fb: "Perfeito! Comunicação constante e vigilância contínua salvam vidas." }
      ]
    },
    {
      title: "🚨 Emergência — Tontura",
      desc: "O Trabalhador começa a passar mal lá dentro!",
      alert: "ALARME: Trabalhador com tontura e queda de O₂!",
      speaker: "worker", speech: "Estou tonto... não me sinto bem!",
      q: "O Vigia deve:",
      options: [
        { t: "Entrar correndo para puxar o colega", ok: false, who: "vigia", fatal: true,
          fb: "FATAL! O Vigia vira a segunda vítima. Mais de 60% das mortes são de socorristas." },
        { t: "Acionar resgate e operar o tripé/guincho de fora", ok: true, who: "rescuer",
          fb: "Correto! Resgate mecânico externo + equipe especializada. Vidas preservadas!" }
      ]
    },
    {
      title: "Equipe de Resgate em Ação",
      desc: "A equipe de resgate foi acionada e chega ao local.",
      alert: "Resgate em andamento!",
      speaker: "rescuer", speech: "Assumimos! Içando pelo tripé!",
      q: "Qual o procedimento correto de resgate?",
      options: [
        { t: "Improvisar com uma corda amarrada na cintura", ok: false, who: "rescuer",
          fb: "Não! Resgate exige tripé, guincho e cinto paraquedista certificados." },
        { t: "Içar pelo tripé/guincho sem ninguém entrar no espaço", ok: true, who: "rescuer",
          fb: "Isso! Resgate sem entrada (non-entry) é sempre a primeira opção segura." }
      ]
    },
    {
      title: "Pós-Emergência",
      desc: "O Trabalhador foi resgatado com vida. E agora?",
      alert: "",
      speaker: "supervisor", speech: "Ótimo trabalho, equipe!",
      q: "Qual a última medida correta?",
      options: [
        { t: "Liberar todos e reabrir a área na hora", ok: false, who: "supervisor",
          fb: "Não. É preciso atendimento médico à vítima e investigar a causa antes de retomar." },
        { t: "Encaminhar a vítima ao médico e investigar a causa raiz", ok: true, who: "supervisor",
          fb: "Correto! Cuidado com a vítima e análise do acidente evitam a repetição." }
      ]
    }
  ];

  const teamState = { round: 0, score: 0, lives: 3, active: false };

  function showTeam() {
    Object.keys(elements.screens).forEach(k => elements.screens[k].classList.remove("active"));
    document.getElementById("screen-theory").classList.remove("active");
    document.getElementById("screen-team").classList.add("active");
    resetTeam();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetTeam() {
    teamState.round = 0; teamState.score = 0; teamState.lives = 3; teamState.active = false;
    document.getElementById("team-score").textContent = "0";
    document.getElementById("team-lives").textContent = "3";
    document.getElementById("team-round").textContent = "1";
    document.getElementById("team-total").textContent = TEAM_SCENES.length;
    document.getElementById("btn-team-start").style.display = "inline-flex";
    document.getElementById("decision-options").innerHTML = "";
    document.getElementById("decision-question").textContent = "Pronto para começar?";
    document.getElementById("team-scene-title").textContent = "Central de Operações — Espaço Confinado";
    document.getElementById("team-scene-desc").textContent = "Cada personagem tem um papel na NR 33. Analise a situação e tome a decisão correta para manter a equipe segura.";
    clearCharStates();
    document.getElementById("stage-alert").classList.remove("show");
    document.getElementById("char-rescuer").classList.remove("deployed");
  }

  function clearCharStates() {
    ["supervisor", "vigia", "worker", "rescuer"].forEach(r => {
      const c = document.getElementById(`char-${r}`);
      if (c) c.classList.remove("highlight", "shake", "entering", "walk");
      const b = document.getElementById(`bubble-${r}`);
      if (b) b.classList.remove("show");
    });
  }

  function speak(role, text) {
    const b = document.getElementById(`bubble-${role}`);
    if (!b) return;
    b.textContent = text;
    b.classList.add("show");
    const c = document.getElementById(`char-${role}`);
    if (c) c.classList.add("highlight");
  }

  function loadTeamScene() {
    clearCharStates();
    const scene = TEAM_SCENES[teamState.round];
    document.getElementById("team-round").textContent = teamState.round + 1;
    document.getElementById("team-scene-title").textContent = scene.title;
    document.getElementById("team-scene-desc").textContent = scene.desc;

    // Alerta de cena
    const alertEl = document.getElementById("stage-alert");
    if (scene.alert) { alertEl.textContent = scene.alert; alertEl.classList.add("show"); audio.startAlarm(); }
    else { alertEl.classList.remove("show"); audio.stopAlarm(); }

    // Deploy da equipe de resgate a partir da cena 5
    if (teamState.round >= 4) document.getElementById("char-rescuer").classList.add("deployed");

    // Fala do personagem
    speak(scene.speaker, scene.speech);
    // Trabalhador treme na emergência
    if (scene.title.includes("Emergência")) {
      document.getElementById("char-worker").classList.add("shake");
    }

    // Pergunta e opções (embaralhadas)
    document.getElementById("decision-question").textContent = scene.q;
    const optsWrap = document.getElementById("decision-options");
    optsWrap.innerHTML = "";
    const shuffled = [...scene.options].sort(() => Math.random() - 0.5);
    shuffled.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "decision-opt";
      btn.innerHTML = `<span>${opt.ok ? "🛡️" : "⚠️"}</span> ${opt.t}`;
      btn.addEventListener("click", () => handleTeamChoice(opt, btn, optsWrap));
      optsWrap.appendChild(btn);
    });
  }

  function handleTeamChoice(opt, btn, wrap) {
    wrap.querySelectorAll(".decision-opt").forEach(b => b.disabled = true);
    audio.stopAlarm();

    if (opt.ok) {
      btn.classList.add("correct");
      audio.playSuccess();
      teamState.score += 100;
      document.getElementById("team-score").textContent = teamState.score;
      addPoints(40);
      speak(opt.who, "✔ Ação correta!");
      // animação positiva
      const c = document.getElementById(`char-${opt.who}`);
      if (c) c.classList.add("walk");
      showToast("✅ " + opt.fb, "success");
      setTimeout(nextTeamRound, 2200);
    } else {
      btn.classList.add("wrong");
      audio.playFailure();
      teamState.lives--;
      document.getElementById("team-lives").textContent = teamState.lives;
      // destaca opção certa
      wrap.querySelectorAll(".decision-opt").forEach(b => {
        if (b.textContent.trim() !== btn.textContent.trim() && b.querySelector("span").textContent === "🛡️") b.classList.add("correct");
      });
      if (opt.fatal) document.getElementById("char-vigia").classList.add("entering");
      showToast("❌ " + opt.fb, "danger");
      if (teamState.lives <= 0) {
        setTimeout(teamGameOver, 2400);
      } else {
        setTimeout(() => { loadTeamScene(); }, 2600); // repete a cena
      }
    }
  }

  function nextTeamRound() {
    teamState.round++;
    if (teamState.round >= TEAM_SCENES.length) {
      teamWin();
    } else {
      loadTeamScene();
    }
  }

  function teamWin() {
    teamState.active = false;
    audio.stopAlarm();
    audio.playVictory && audio.playVictory();
    audio.playSuccess();
    showFeedbackModal(
      "Simulador de Equipe Concluído! 🏆",
      `Você coordenou a equipe com ${teamState.score} pontos!`,
      "Você dominou o trabalho em equipe da NR 33: liberação correta com PET, teste atmosférico completo, vigilância contínua e — o mais importante — resgate sem que o Vigia entrasse no espaço. Cada personagem cumpriu seu papel e todos voltaram para casa!",
      true, true
    );
  }

  function teamGameOver() {
    teamState.active = false;
    audio.stopAlarm();
    triggerGameOver(
      "Simulação Encerrada",
      "As decisões incorretas comprometeram a segurança da equipe.",
      "<strong>NR 33:</strong> Cada papel (Supervisor, Vigia, Trabalhador e Resgate) precisa agir com precisão. Reveja a teoria e tente novamente — a segurança em espaço confinado não admite improviso."
    );
  }

  document.getElementById("btn-team-start").addEventListener("click", () => {
    audio.playClick();
    teamState.active = true;
    document.getElementById("btn-team-start").style.display = "none";
    // animação de entrada dos personagens
    ["supervisor", "vigia", "worker"].forEach((r, i) => {
      const c = document.getElementById(`char-${r}`);
      setTimeout(() => c && c.classList.add("walk"), i * 200);
      setTimeout(() => c && c.classList.remove("walk"), i * 200 + 1000);
    });
    loadTeamScene();
  });

  document.getElementById("btn-team-exit").addEventListener("click", () => {
    audio.playClick();
    audio.stopAlarm();
    goToPhase(0);
  });

  document.getElementById("btn-arcade-open").addEventListener("click", () => {
    audio.playClick();
    showTeam();
  });

  // --- L. INICIALIZAÇÃO INICIAL ---
  goToPhase(0);

  // Iniciar jogo no botão (agora começa pela teoria)
  elements.btnStartGame.addEventListener("click", () => {
    audio.playClick();
    showTheory();
  });

  // Função utilitária de toast de feedback rápido
  function showToast(message, type = "info") {
    // Simular o toast injetado
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "info";
    if (type === "success") icon = "check-circle";
    if (type === "danger") icon = "alert-triangle";
    
    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span>${message}</span>
    `;
    
    // Estilos do toast de backup para garantir
    toast.style.position = "fixed";
    toast.style.bottom = "2rem";
    toast.style.right = "2rem";
    toast.style.backgroundColor = "var(--color-bg-card)";
    toast.style.border = "1px solid var(--color-border)";
    toast.style.padding = "0.75rem 1.25rem";
    toast.style.borderRadius = "var(--border-radius-md)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "0.5rem";
    toast.style.fontSize = "0.8rem";
    toast.style.fontWeight = "700";
    toast.style.zIndex = "9999";
    toast.style.borderLeft = "4px solid " + (type === "success" ? "var(--color-safety-green)" : type === "danger" ? "var(--color-danger-red)" : "var(--color-alert-yellow)");
    
    document.body.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
