// ===================== AUTHORIZATION SYSTEM =====================
// Trial/Full version gate -- machine fingerprint + password check.
// Importing this module runs the IIFE below, which checks authorization and,
// if granted, calls back into app.js's `initializeApp` to start the app.
import { initializeApp } from '../app.js';

(function() {
  'use strict';

  // Obfuscated configuration (harder to find)
  const _cfg = {
    _p1: atob("THVmZnlAMTIz"),
    _p2: String.fromCharCode(110, 111, 116, 107, 110, 111, 119, 110),
    _k: "dental_app_auth_machines", // Storage key
    _v: 1, // Version
    _versionKey: "dental_app_version_type" // Storage key for version type
  };

  // Get stored version type
  function _getVersionType() {
    try {
      return localStorage.getItem(_cfg._versionKey) || null;
    } catch {
      return null;
    }
  }

  // Store version type
  function _setVersionType(versionType) {
    try {
      localStorage.setItem(_cfg._versionKey, versionType);
      return true;
    } catch {
      return false;
    }
  }

  // Show version selection dialog
  function _showVersionSelectionDialog() {
    return new Promise((resolve) => {
      const _dialog = document.createElement('div');
      _dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Segoe UI', sans-serif;
      `;

      _dialog.innerHTML = `
        <div style="background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; width: 90%;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🚀</div>
            <h2 style="color: #1b2735; margin: 0 0 0.5rem 0; font-size: 1.5rem;">Select Version</h2>
            <p style="color: #6c7a89; margin: 0; font-size: 0.9rem;">Choose your application version</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
            <button id="trialVersionBtn" style="padding: 1.25rem; background: #f5f7fb; border: 2px solid #d9e2ec; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; text-align: left;">
              <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">🆓 Trial Version</div>
              <div style="color: #6c7a89; font-size: 0.9rem; font-weight: normal;">No password required. Full access to all features.</div>
            </button>
            <button id="fullVersionBtn" style="padding: 1.25rem; background: #f5f7fb; border: 2px solid #d9e2ec; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; text-align: left;">
              <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">🔐 Full Version</div>
              <div style="color: #6c7a89; font-size: 0.9rem; font-weight: normal;">Password protected. Requires authorization key.</div>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(_dialog);

      const _trialBtn = _dialog.querySelector('#trialVersionBtn');
      const _fullBtn = _dialog.querySelector('#fullVersionBtn');

      // Hover effects
      _trialBtn.addEventListener('mouseenter', () => {
        _trialBtn.style.background = '#e8f4f8';
        _trialBtn.style.borderColor = '#2374ab';
      });
      _trialBtn.addEventListener('mouseleave', () => {
        _trialBtn.style.background = '#f5f7fb';
        _trialBtn.style.borderColor = '#d9e2ec';
      });

      _fullBtn.addEventListener('mouseenter', () => {
        _fullBtn.style.background = '#e8f4f8';
        _fullBtn.style.borderColor = '#2374ab';
      });
      _fullBtn.addEventListener('mouseleave', () => {
        _fullBtn.style.background = '#f5f7fb';
        _fullBtn.style.borderColor = '#d9e2ec';
      });

      // Handle selection
      _trialBtn.addEventListener('click', () => {
        _setVersionType('trial');
        document.body.removeChild(_dialog);
        resolve('trial');
      });

      _fullBtn.addEventListener('click', () => {
        _setVersionType('full');
        document.body.removeChild(_dialog);
        resolve('full');
      });
    });
  }

  // Combine parts (obfuscated)
  function _getKey() {
    return _cfg._p1 + "_" + _cfg._p2;
  }

  // Generate machine signature (looks like normal utility)
  // Normalize user agent to remove version numbers (stable across browser updates)
  function _normalizeUA(ua) {
    if (!ua) return '';
    // Remove version numbers from user agent to make it stable across updates
    // Example: "Chrome/120.0.0.0" becomes "Chrome"
    return ua.replace(/\/(\d+\.\d+\.\d+\.\d+)/g, '')
             .replace(/\/(\d+\.\d+)/g, '')
             .replace(/\sVersion\/[\d.]+/g, '');
  }

  function _genSig() {
    const _d = [
      _normalizeUA(navigator.userAgent), // Normalized (version-independent)
      navigator.platform,
      screen.width + 'x' + screen.height,
      navigator.hardwareConcurrency,
      new Date().getTimezoneOffset(),
      navigator.language || 'en',
      screen.colorDepth || 24
    ];
    let _h = 0;
    for (let i = 0; i < _d.join('|').length; i++) {
      _h = ((_h << 5) - _h) + _d.join('|').charCodeAt(i);
      _h = _h & _h;
    }
    return Math.abs(_h).toString(16).toUpperCase();
  }

  // Get authorized list (looks like data utility)
  function _getAuthList() {
    try {
      const _s = localStorage.getItem(_cfg._k);
      return _s ? JSON.parse(_s) : [];
    } catch {
      return [];
    }
  }

  // Validate and add machine (obfuscated)
  function _validateAndAdd(_sig, _input) {
    const _key = _getKey();
    if (_input !== _key) {
      return { ok: false, msg: "Invalid credentials" };
    }
    const _list = _getAuthList();
    if (!_list.includes(_sig)) {
      _list.push(_sig);
      localStorage.setItem(_cfg._k, JSON.stringify(_list));
      return { ok: true, msg: "Authorization successful" };
    }
    return { ok: true, msg: "Already authorized" };
  }

  // Check authorization (main validation)
  async function _checkAuth() {
    // Get version type (show dialog if not set)
    let versionType = _getVersionType();
    if (!versionType) {
      versionType = await _showVersionSelectionDialog();
    }

    // Trial version: Skip password check, auto-authorize
    if (versionType === 'trial') {
      const _sig = _genSig();
      const _list = _getAuthList();
      // Auto-add to authorized list for trial version
      if (!_list.includes(_sig)) {
        _list.push(_sig);
        localStorage.setItem(_cfg._k, JSON.stringify(_list));
      }
      return true; // Auto-authorized for trial
    }

    // Full version: Require password
    const _sig = _genSig();
    const _list = _getAuthList();

    if (_list.includes(_sig)) {
      return true; // Already authorized
    }

    // Not authorized - show custom password dialog
    return new Promise((resolve) => {
      // Create password dialog
      const _dialog = document.createElement('div');
      _dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Segoe UI', sans-serif;
      `;

      _dialog.innerHTML = `
        <div style="background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 450px; width: 90%;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔐</div>
            <h2 style="color: #1b2735; margin: 0 0 0.5rem 0; font-size: 1.5rem;">System Authorization</h2>
            <p style="color: #6c7a89; margin: 0; font-size: 0.9rem;">This system requires authorization</p>
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #1b2735; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">System ID:</label>
            <div style="background: #f5f7fb; padding: 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #6c7a89; word-break: break-all;">${_sig}</div>
          </div>
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; color: #1b2735; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Enter Authorization Key:</label>
            <input type="password" id="authPasswordInput" style="width: 100%; padding: 0.75rem; border: 2px solid #d9e2ec; border-radius: 6px; font-size: 1rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;" placeholder="Enter password..." autofocus />
            <div id="authErrorMsg" style="color: #cc4b4b; font-size: 0.85rem; margin-top: 0.5rem; display: none;"></div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button id="authSubmitBtn" style="flex: 1; padding: 0.75rem; background: #2374ab; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s;">Authorize</button>
            <button id="authCancelBtn" style="flex: 1; padding: 0.75rem; background: transparent; color: #6c7a89; border: 2px solid #d9e2ec; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(_dialog);

      const _input = _dialog.querySelector('#authPasswordInput');
      const _submitBtn = _dialog.querySelector('#authSubmitBtn');
      const _cancelBtn = _dialog.querySelector('#authCancelBtn');
      const _errorMsg = _dialog.querySelector('#authErrorMsg');

      // Handle Enter key
      _input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          _submitBtn.click();
        }
      });

      // Handle submit
      _submitBtn.addEventListener('click', () => {
        const _password = _input.value.trim();
        if (!_password) {
          _errorMsg.textContent = 'Please enter authorization key';
          _errorMsg.style.display = 'block';
          return;
        }

        const _result = _validateAndAdd(_sig, _password);

        if (_result.ok) {
          document.body.removeChild(_dialog);
          alert("✅ " + _result.msg + "\n\nThe application will now work on this system.");
          resolve(true);
        } else {
          _errorMsg.textContent = _result.msg;
          _errorMsg.style.display = 'block';
          _input.value = '';
          _input.focus();
          // Add visual feedback for wrong password
          _input.style.borderColor = '#cc4b4b';
          setTimeout(() => {
            _input.style.borderColor = '#d9e2ec';
          }, 2000);
        }
      });

      // Add hover effects for buttons
      _submitBtn.addEventListener('mouseenter', () => {
        _submitBtn.style.background = '#165078';
      });
      _submitBtn.addEventListener('mouseleave', () => {
        _submitBtn.style.background = '#2374ab';
      });

      _cancelBtn.addEventListener('mouseenter', () => {
        _cancelBtn.style.background = '#f5f7fb';
      });
      _cancelBtn.addEventListener('mouseleave', () => {
        _cancelBtn.style.background = 'transparent';
      });

      // Handle cancel
      _cancelBtn.addEventListener('click', () => {
        document.body.removeChild(_dialog);
        document.body.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f7fb; font-family: 'Segoe UI', sans-serif;">
            <div style="background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); max-width: 500px; text-align: center;">
              <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
              <h1 style="color: #cc4b4b; margin: 0 0 1rem 0; font-size: 1.8rem;">Authorization Required</h1>
              <p style="color: #6c7a89; margin: 0 0 1.5rem 0; line-height: 1.6;">
                This application requires valid authorization to run.
              </p>
            </div>
          </div>
        `;
        resolve(false);
      });

      // Focus input
      setTimeout(() => _input.focus(), 100);
    });
  }

  // Execute check before app initialization
  _checkAuth().then(authorized => {
    if (authorized) {
      // Authorization successful - start the app
      initializeApp();
    }
  }).catch(() => {
    // Authorization failed - error already displayed
    console.error('System validation failed');
  });
})();
// ===================== END AUTHORIZATION SYSTEM =====================
