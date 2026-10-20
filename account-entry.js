import {accounts} from './account-store.js?v=219';
import {installAccountUI} from './account-ui.js?v=219';
import {initLanguages} from './i18n.js?v=219';
const locale=initLanguages();
document.body.classList.add('account-gated');
const ui=installAccountUI({accounts,locale});
let error;try{await accounts.init();}catch(e){error=e;}
await ui.enter(error);
document.body.classList.remove('account-gated');
try{await import('./main.js?v=2.0.0-preview.17');}catch(e){const loading=document.getElementById('loading');if(loading){loading.querySelector('p').textContent=({en:'Unable to load the game. Refresh to retry.',fr:'Chargement impossible. Actualisez pour réessayer.',ja:'読み込めませんでした。再読み込みしてください。',ko:'게임을 불러올 수 없습니다. 새로고침하세요.'})[locale.language]||'游戏未能载入，请刷新后重试。';}console.error('Game startup failed',e);}
