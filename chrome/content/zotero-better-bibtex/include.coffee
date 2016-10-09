if not Zotero.BetterBibTeX
  do ->
    loader = Components.classes['@mozilla.org/moz/jssubscript-loader;1'].getService(Components.interfaces.mozIJSSubScriptLoader)

    for script in ["zotero-better-bibtex.js","lib/lokijs.js","lib/citeproc.js","lib/vardump.js","lib/fold-to-ascii.js","lib/punycode.js","preferences.js","translators.js","db.js","csl-localedata.js","BetterBibTeXPatternFormatter.js","BetterBibTeXPatternParser.js","keymanager.js","journalAbbrev.js","web-endpoints.js","schomd.js","cayw.js","debug-bridge.js","cache.js","autoexport.js","serialized.js"]
      try
        Zotero.debug('BBT: ' + script)
        loader.loadSubScript("chrome://zotero-better-bibtex/content/#{script}")
      catch err
        try
          Zotero.BetterBibTeX.disable("BBT: failed to load #{script}: #{err}")
        loader = null

    if loader
      try
        Zotero.debug('BBT: scheduling init')
        window.addEventListener('load', (load = (event) ->
          Zotero.debug('BBT: init')
          window.removeEventListener('load', load, false) #remove listener, no longer needed
          try
            Zotero.BetterBibTeX.init()
          catch err
            Zotero.debug('BBT: failed to initialize: ' + err)
          return
        ), false)
      catch err
        Zotero.debug('BBT: failed to schedule init: ' + err)
