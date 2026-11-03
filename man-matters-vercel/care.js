(() => {
  const $ = (s) => document.querySelector(s);
  const toast = (message) => { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.remove('show'),2600); };
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t=>{t.classList.toggle('active',t===btn);t.setAttribute('aria-selected',String(t===btn));});
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden'));
    $('#'+btn.dataset.tab+'-panel').classList.remove('hidden');
  }));
  const checks=[...document.querySelectorAll('.habit-check')];
  const updateHabits=()=>{const n=checks.filter(c=>c.checked).length;$('#habit-progress').textContent=`${n} of 3 completed`;};
  checks.forEach(c=>c.addEventListener('change',updateHabits));
  let taken=true, doses=16, streak=7;
  $('#dose-button').addEventListener('click',()=>{taken=!taken; if(taken){doses++;streak++;}else{doses=Math.max(0,doses-1);streak=Math.max(0,streak-1);} $('#dose-count').textContent=doses;$('#streak-count').textContent=streak;$('#taken-status').textContent=taken?'Taken ✓':'Not taken';$('#dose-button').textContent=taken?'✓ Dose completed':'Mark dose as taken';$('#dose-button').classList.toggle('completed',taken);toast(taken?'Dose marked as completed':'Dose marked as not taken');});
  $('#change-reminder').addEventListener('click',()=>{const time=prompt('Choose your daily reminder time (for example, 8:30 AM):','9:00 AM');if(time&&time.trim()){$('.stat-card:nth-child(4) strong').textContent=time.trim();toast('Reminder time updated in this demo');}});
  const cal=$('#calendar');for(let d=1;d<=30;d++){const cell=document.createElement('span');cell.textContent=d;if(d<18)cell.classList.add('done');if(d===18)cell.classList.add('current');cal.appendChild(cell);}
  $('#doctor-button').addEventListener('click',()=>toast('Check-in request saved in this demo.'));
  $('#refill-button').addEventListener('click',()=>toast('Refill options are illustrative in this prototype.'));
  $('#whatsapp-button').addEventListener('click',()=>toast('WhatsApp check-ins are simulated. No message was sent.'));
  $('#dose-button').classList.add('completed');
})();
