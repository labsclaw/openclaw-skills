// Pipeline Monitor — polling-based monitoring for long pipelines
// Uso: node scripts/pipeline-monitor.js <pipeline-id> <action> [options]
//
// Acoes:
//   create <name> <total-steps>      — Cria pipeline status file + cron monitor
//   status <pipeline-id>             — Mostra status atual da pipeline
//   update <pipeline-id> <step-id>   — Avanca/marca passo como concluido (1-indexed)
//   fail <pipeline-id> <reason>      — Marca pipeline como falha
//   cleanup <pipeline-id>            — Remove pipeline file + cron monitor
//   zombie-check                     — Scan ALL pipelines for zombie steps (timeout x 1.5)
//   set-handoff <step> '<json>'      — Define handoff payload para um passo
//   get-handoff <step>               — Le handoff payload de um passo
//
// Exemplo:
//   node scripts/pipeline-monitor.js ope-49 create "Fase 1 Minara" 5
//   node scripts/pipeline-monitor.js ope-49 update 2
//   node scripts/pipeline-monitor.js ope-49 set-handoff 2 '{"summary":"Feito","nextSteps":"Proximo"}'
//   node scripts/pipeline-monitor.js _ zombie-check

const fs = require('fs');
const path = require('path');

const [,, pipelineId, action, ...args] = process.argv;
const PIPELINES_DIR = path.join(__dirname, '..', 'memory', 'pipelines');

if (!pipelineId || !action) {
  console.error('Uso: node pipeline-monitor.js <pipeline-id> <create|status|update|fail|cleanup> [args...]');
  process.exit(1);
}

fs.mkdirSync(PIPELINES_DIR, { recursive: true });

function getFilePath() {
  return path.join(PIPELINES_DIR, `${pipelineId}.json`);
}

function load() {
  const fp = getFilePath();
  if (!fs.existsSync(fp)) {
    console.error(`❌ Pipeline "${pipelineId}" não encontrada em ${fp}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function save(data) {
  const fp = getFilePath();
  const tmp = fp + '.tmp';
  // Atomic write: .tmp → remove old → rename (Windows-safe)
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
  }
  fs.renameSync(tmp, fp);
  console.log(`💾 ${pipelineId} atualizado em ${new Date().toISOString()}`);
}

// ─── ACTIONS ───

if (action === 'create') {
  const [name, totalStepsStr] = args;
  if (!name || !totalStepsStr) {
    console.error('Uso: node pipeline-monitor.js <id> create "<name>" <total-steps>');
    process.exit(1);
  }
  const totalSteps = parseInt(totalStepsStr);
  if (isNaN(totalSteps) || totalSteps < 1) {
    console.error('total-steps deve ser um número >= 1');
    process.exit(1);
  }

  const steps = Array.from({ length: totalSteps }, (_, i) => ({
    id: i + 1,
    name: `Passo ${i + 1}`,
    status: 'pending',
    startedAt: null,
    completedAt: null,
    timeout: 300,
    retries: 0,
    maxRetries: 3,
    handoff: null,
    error: null
  }));

  const now = new Date().toISOString();
  const pipeline = {
    id: pipelineId,
    name,
    status: 'running',
    createdAt: now,
    updatedAt: now,
    totalSteps,
    currentStep: 1,
    steps,
    logs: [`🚀 Pipeline iniciada em ${now}`],
    nextAction: steps[0].name
  };

  // Don't overwrite existing
  if (fs.existsSync(getFilePath())) {
    console.error(`❌ Pipeline "${pipelineId}" já existe. Use cleanup primeiro.`);
    process.exit(1);
  }

  save(pipeline);
  console.log(`✅ Pipeline "${name}" (${pipelineId}) criada com ${totalSteps} passos`);
  console.log(`📁 ${getFilePath()}`);
  console.log('');
  console.log('Para criar o cron monitor automático:');
  console.log(`  Cron job: every 10min, agentTurn, message="🔔 [PIPELINE] ${pipelineId} — status check"`);

} else if (action === 'status') {
  const p = load();
  const done = p.steps.filter(s => s.status === 'done').length;
  const failed = p.steps.filter(s => s.status === 'failed').length;
  const running = p.steps.filter(s => s.status === 'running').length;
  const pending = p.steps.filter(s => s.status === 'pending').length;

  console.log(`📊 Pipeline: ${p.name} (${p.id})`);
  console.log(`   Status: ${p.status}`);
  console.log(`   Progresso: ${done}/${p.totalSteps} passos concluídos`);
  if (running) console.log(`   ▶️ Rodando: ${running}`);
  if (pending) console.log(`   ⏳ Pendentes: ${pending}`);
  if (failed) console.log(`   ❌ Falhas: ${failed}`);
  console.log('');
  console.log('   Passos:');
  p.steps.forEach(s => {
    const icon = s.status === 'done' ? '✅' : s.status === 'running' ? '▶️' : s.status === 'failed' ? '❌' : '⏳';
    console.log(`   ${icon} Passo ${s.id}: ${s.name} [${s.status}]`);
  });
  console.log('');
  console.log(`   ⏱ Criado: ${p.createdAt}`);
  console.log(`   ⏱ Última atualização: ${p.updatedAt}`);
  if (p.logs.length > 0) {
    console.log('   Logs (últimos 5):');
    p.logs.slice(-5).forEach(l => console.log(`   📝 ${l}`));
  }
  if (p.status === 'running') console.log(`   Próximo: ${p.nextAction || '—'}`);

} else if (action === 'update') {
  const stepIdArg = parseInt(args[0]);
  if (isNaN(stepIdArg)) {
    console.error('Uso: node pipeline-monitor.js <id> update <step-number> ["log message"]');
    process.exit(1);
  }

  const p = load();
  const stepIdx = p.steps.findIndex(s => s.id === stepIdArg);
  if (stepIdx === -1) {
    console.error(`❌ Passo ${stepIdArg} não encontrado`);
    process.exit(1);
  }

  const step = p.steps[stepIdx];
  if (step.status === 'done') {
    console.error(`⚠️ Passo ${stepIdArg} já estava concluído`);
    process.exit(0);
  }

  const logMsg = args.slice(1).join(' ') || `Passo ${stepIdArg} concluído`;
  step.status = 'done';
  step.completedAt = new Date().toISOString();
  p.updatedAt = new Date().toISOString();
  p.logs.push(`✅ ${logMsg} — ${p.updatedAt}`);

  // Check if all done
  const allDone = p.steps.every(s => s.status === 'done');
  if (allDone) {
    p.status = 'done';
    p.logs.push(`🏁 Pipeline "${p.name}" concluída!`);
    p.nextAction = null;
    console.log(`🏁 Pipeline "${p.name}" COMPLETA!`);
  } else {
    // Find next pending
    const nextStep = p.steps.find(s => s.status === 'pending');
    if (nextStep) {
      nextStep.status = 'running';
      nextStep.startedAt = new Date().toISOString();
      p.currentStep = nextStep.id;
      p.nextAction = nextStep.name;
      p.logs.push(`▶️ Iniciando passo ${nextStep.id}: ${nextStep.name}`);
    }
  }

  save(p);

  // Output status for cron to read
  if (p.status === 'done') {
    console.log('PIPELINE_STATUS=done');
    console.log('PRÓXIMO_PASSO: remova o cron monitor manualmente');
  } else {
    console.log(`PIPELINE_STATUS=running | passo atual: ${p.currentStep}`);
  }

} else if (action === 'fail') {
  const reason = args.join(' ') || 'Falha não especificada';
  const p = load();
  p.status = 'failed';
  p.updatedAt = new Date().toISOString();
  p.logs.push(`❌ FALHA: ${reason} — ${p.updatedAt}`);
  p.nextAction = null;
  save(p);
  console.log(`❌ Pipeline "${p.name}" marcada como falha. Motivo: ${reason}`);
  console.log('PIPELINE_STATUS=failed');
  console.log('PRÓXIMO_PASSO: investigar e decidir se reinicia');

} else if (action === 'cleanup') {
  const fp = getFilePath();
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log(`🗑️ Pipeline ${pipelineId} removida`);
    console.log('Lembrete: remover também o cron monitor manualmente:');
    console.log('  cron(action="list") → localizar job → cron(action="remove", jobId="<id>")');
  } else {
    console.log(`ℹ️ Pipeline ${pipelineId} não encontrada (já removida)`);
  }
} else if (action === 'zombie-check') {
  // Scan ALL pipelines for zombie steps (running > timeout * 1.5)
  const files = fs.readdirSync(PIPELINES_DIR).filter(f => f.endsWith('.json'));
  let zombiesFound = 0;
  let retried = 0;
  let failed = 0;

  for (const file of files) {
    const fp = path.join(PIPELINES_DIR, file);
    const p = JSON.parse(fs.readFileSync(fp, 'utf8'));
    let changed = false;

    for (const step of p.steps) {
      if (step.status !== 'running') continue;
      if (!step.startedAt) continue;

      const elapsed = (Date.now() - new Date(step.startedAt).getTime()) / 1000;
      const timeout = (step.timeout || 300) * 1.5;

      if (elapsed > timeout) {
        zombiesFound++;
        step.retries = (step.retries || 0) + 1;
        const maxRetries = step.maxRetries || 3;

        if (step.retries <= maxRetries) {
          step.status = 'pending';
          step.startedAt = null;
          retried++;
          p.logs.push('zombie-retry: Passo ' + step.id + ' (' + step.name + ') retry ' + step.retries + '/' + maxRetries);
          console.log('zombie-retry: ' + file + ' Passo ' + step.id + ' (' + step.name + ') retry ' + step.retries + '/' + maxRetries);
        } else {
          step.status = 'failed';
          step.error = 'Timeout: ' + Math.round(elapsed) + 's > ' + Math.round(timeout) + 's (max retries excedido)';
          failed++;
          p.logs.push('zombie-fatal: Passo ' + step.id + ' (' + step.name + ') falhou apos ' + maxRetries + ' tentativas');
          console.log('zombie-fatal: ' + file + ' Passo ' + step.id + ' (' + step.name + ') FALHOU apos ' + maxRetries + ' tentativas');
        }
        changed = true;
      }
    }

    if (changed && p.steps.every(s => s.status === 'failed')) {
      p.status = 'failed';
      p.logs.push('pipeline-failed: ' + p.name + ' (todos os steps falharam)');
    }

    if (changed) {
      p.updatedAt = new Date().toISOString();
      const tmp = fp + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(p, null, 2));
      fs.unlinkSync(fp);
      fs.renameSync(tmp, fp);
    }
  }

  if (zombiesFound === 0) {
    console.log('Nenhum zumbi detectado');
  } else {
    console.log('Resumo: ' + zombiesFound + ' zumbis | ' + retried + ' retries | ' + failed + ' fatal');
  }
  console.log('PIPELINE_ZOMBIES=' + zombiesFound);

} else if (action === 'set-handoff') {
  const stepIdArg = parseInt(args[0]);
  const handoffJson = args.slice(1).join(' ');
  if (isNaN(stepIdArg) || !handoffJson) {
    console.error('Uso: node pipeline-monitor.js <id> set-handoff <step> \'<json>');
    process.exit(1);
  }

  const p = load();
  const step = p.steps.find(s => s.id === stepIdArg);
  if (!step) {
    console.error('Passo ' + stepIdArg + ' nao encontrado');
    process.exit(1);
  }

  let handoff;
  try {
    handoff = JSON.parse(handoffJson);
  } catch (e) {
    console.error('JSON invalido: ' + e.message);
    process.exit(1);
  }

  const handoffStr = JSON.stringify(handoff);
  handoff.tokenCount = Math.ceil(handoffStr.length / 4);

  if (handoff.tokenCount > 500) {
    console.warn('Handoff estimado em ' + handoff.tokenCount + ' tokens (limite: 500). Considere comprimir.');
  }

  step.handoff = handoff;
  p.updatedAt = new Date().toISOString();
  p.logs.push('Handoff definido para Passo ' + stepIdArg + ' (~' + handoff.tokenCount + ' tokens)');
  save(p);
  console.log('Handoff salvo para Passo ' + stepIdArg + ' (~' + handoff.tokenCount + ' tokens)');

} else if (action === 'get-handoff') {
  const stepIdArg = parseInt(args[0]);
  if (isNaN(stepIdArg)) {
    console.error('Uso: node pipeline-monitor.js <id> get-handoff <step>');
    process.exit(1);
  }

  const p = load();
  const step = p.steps.find(s => s.id === stepIdArg);
  if (!step) {
    console.error('Passo ' + stepIdArg + ' nao encontrado');
    process.exit(1);
  }

  if (!step.handoff) {
    console.log('Passo ' + stepIdArg + ' nao tem handoff');
  } else {
    console.log(JSON.stringify(step.handoff, null, 2));
  }

} else {
  console.error('Acao desconhecida: ' + action);
  console.error('Acoes validas: create, status, update, fail, cleanup, zombie-check, set-handoff, get-handoff');
  process.exit(1);
}
