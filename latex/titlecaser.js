/*global CSL: true */

/**
 * A Javascript implementation of the CSL citation formatting language.
 *
 * <p>A configured instance of the process is built in two stages,
 * using {@link CSL.Core.Build} and {@link CSL.Core.Configure}.
 * The former sets up hash-accessible locale data and imports the CSL format file
 * to be applied to the citations,
 * transforming it into a one-dimensional token list, and
 * registering functions and parameters on each token as appropriate.
 * The latter sets jump-point information
 * on tokens that constitute potential branch
 * points, in a single back-to-front scan of the token list.
 * This
 * yields a token list that can be executed front-to-back by
 * body methods available on the
 * {@link CSL.Engine} class.</p>
 *
 * <p>This top-level {@link CSL} object itself carries
 * constants that are needed during processing.</p>
 * @namespace A CSL citation formatter.
 */

// IE6 does not implement Array.indexOf().
// IE7 neither, according to rumour.

// Potential skip words:
// under; along; out; between; among; outside; inside; amid; amidst; against; toward; towards.
// See https://forums.zotero.org/discussion/30484/?Focus=159613#Comment_159613

Translator.TitleCaser = {

    PROCESSOR_VERSION: "1.1.146",

    FIELD_CATEGORY_REMAP: {
        "title": "title",
        "container-title": "container-title",
        "collection-title": "collection-title",
        "number": "number",
        "place": "place",
        "archive": "collection-title",
        "title-short": "title",
        "genre": "title",
        "event": "title",
        "medium": "title",
		"archive-place": "place",
		"publisher-place": "place",
		"event-place": "place",
		"jurisdiction": "place",
		"language-name": "place",
		"language-name-original": "place",
        "call-number": "number",
        "chapter-number": "number",
        "collection-number": "number",
        "edition": "number",
        "page": "number",
        "issue": "number",
        "locator": "number",
        "number-of-pages": "number",
        "number-of-volumes": "number",
        "volume": "number",
        "citation-number": "number",
        "publisher": "institution-part",
        "authority": "institution-part"
    },
    
    TERMINAL_PUNCTUATION: [":", ".", ";", "!", "?", " "],

    // update modes

    //
    // \u0400-\u042f are cyrillic and extended cyrillic capitals
    // this is not fully smart yet.  can't do what this was trying to do
    // with regexps, actually; we want to identify strings with a leading
    // capital letter, and any subsequent capital letters.  Have to compare
    // locale caps version with existing version, character by character.
    // hard stuff, but if it breaks, that's what to do.
    // \u0600-\u06ff is Arabic/Persian
    // \u200c-\u200e and \u202a-\u202e are special spaces and left-right 
    // control characters

    //var x = new Array();
    //x = x.concat(["title","container-title","issued","page"]);
    //x = x.concat(["locator","collection-number","original-date"]);
    //x = x.concat(["reporting-date","decision-date","filing-date"]);
    //x = x.concat(["revision-date"]);
    //NUMERIC_VARIABLES = x.slice();

    TITLE_FIELD_SPLITS: function(seg) {
        var keys = ["title", "short", "main", "sub"];
        var ret = {};
        for (var i=0,ilen=keys.length;i<ilen;i++) {
            ret[keys[i]] = seg + "title" + (keys[i] === "title" ? "" : "-" + keys[i]);
        }
        return ret;
    },
    
    // TAG_USEALL: /(<[^>]+>)/,

    demoteNoiseWords: function (state, fld, drop_or_demote) {
        var SKIP_WORDS = state.locale[state.opt.lang].opts["leading-noise-words"];
        if (fld && drop_or_demote) {
            fld = fld.split(/\s+/);
            fld.reverse();
            var toEnd = [];
            for (var j  = fld.length - 1; j > -1; j += -1) {
                if (SKIP_WORDS.indexOf(fld[j].toLowerCase()) > -1) {
                    toEnd.push(fld.pop());
                } else {
                    break;
                }
            }
            fld.reverse();
            var start = fld.join(" ");
            var end = toEnd.join(" ");
            if ("drop" === drop_or_demote || !end) {
                fld = start;
            } else if ("demote" === drop_or_demote) {
                fld = [start, end].join(", ");
            }
        }
        return fld;
    },

    extractTitleAndSubtitle: function (Item) {
        var segments = ["", "container-"];
        for (var i=0,ilen=segments.length;i<ilen;i++) {
            var seg = segments[i];
            var title = CSL.TITLE_FIELD_SPLITS(seg);
            var langs = [false];
            if (Item.multi) {
                for (var lang in Item.multi._keys[title.short]) {
                    langs.push(lang);
                }
            }
            for (var j=0,jlen=langs.length;j<ilen;j++) {
                var lang = langs[j];
                var vals = {};
                if (lang) {
                    if (Item.multi._keys[title.title]) {
                        vals[title.title] = Item.multi._keys[title.title][lang];
                    }
                    if (Item.multi._keys[title["short"]]) {
                        vals[title["short"]] = Item.multi._keys[title["short"]][lang];
                    }
                } else {
                    vals[title.title] = Item[title.title];
                    vals[title["short"]] = Item[title["short"]];
                }
                vals[title.main] = vals[title.title];
                vals[title.sub] = false;
                if (vals[title.title] && vals[title["short"]]) {
                    var shortTitle = vals[title["short"]];
                    offset = shortTitle.length;
                    if (vals[title.title].slice(0,offset) === shortTitle && vals[title.title].slice(offset).match(/^\s*:/)) {
                        vals[title.main] = vals[title.title].slice(0,offset).replace(/\s+$/,"");
                        vals[title.sub] = vals[title.title].slice(offset).replace(/^\s*:\s*/,"");
                    }
                }
                if (lang) {
                    for (var key in vals) {
                        if (!Item.multi._keys[key]) {
                            Item.multi._keys[key] = {};
                        }
                        Item.multi._keys[key][lang] = vals[key];
                    }
                } else {
                    for (var key in vals) {
                        Item[key] = vals[key];
                    }
                }
            }
        }
    },

    titlecaseSentenceOrNormal: function(state, Item, seg, lang, sentenceCase) {
        var title = CSL.TITLE_FIELD_SPLITS(seg);
        var vals = {};
        if (lang && Item.multi) {
            if (Item.multi._keys[title.title]) {
                vals[title.title] = Item.multi._keys[title.title][lang];
            }
            if (Item.multi._keys[title.main]) {
                vals[title.main] = Item.multi._keys[title.main][lang];
            }
            if (Item.multi._keys[title.sub]) {
                vals[title.sub] = Item.multi._keys[title.sub][lang];
            }
        } else {
            vals[title.title] = Item[title.title];
            vals[title.main] = Item[title.main];
            vals[title.sub] = Item[title.sub];
        }
        if (vals[title.main] && vals[title.sub]) {
            var mainTitle = vals[title.main];
            var subTitle = vals[title.sub];
            if (sentenceCase) {
                mainTitle = Translator.TitleCaser.Output.Formatters.sentence(state, mainTitle);
                subTitle = Translator.TitleCaser.Output.Formatters.sentence(state, subTitle);
            } else {
                subTitle = Translator.TitleCaser.Output.Formatters["capitalize-first"](state, subTitle);
            }
            return [mainTitle, subTitle].join(vals[title.title].slice(mainTitle.length, -1 * subTitle.length));
        } else {
            if (sentenceCase) {
                return Translator.TitleCaser.Output.Formatters.sentence(state, vals[title.title]);
            } else {
                return vals[title.title];
            }
        }
    },

    getSafeEscape: function(state) {
        if (["bibliography", "citation"].indexOf(state.tmp.area) > -1) {
            // Callback to apply thin space hack
            // Callback to force LTR/RTL on parens and braces
            var callbacks = [];
            if (state.opt.development_extensions.thin_non_breaking_space_html_hack && state.opt.mode === "html") {
                callbacks.push(function (txt) {
                    return txt.replace(/\u202f/g, '<span style="white-space:nowrap">&thinsp;</span>');
                });
            }
            if (callbacks.length) {
                return function (txt) {
                    for (var i = 0, ilen = callbacks.length; i < ilen; i += 1) {
                        txt = callbacks[i](txt);
                    }
                    return CSL.Output.Formats[state.opt.mode].text_escape(txt);
                }
            } else {
                return CSL.Output.Formats[state.opt.mode].text_escape;
            }
        } else {
            return function (txt) { return txt; };
        }
    },

    SKIP_WORDS: ["about","above","across","afore","after","against","along","alongside","amid","amidst","among","amongst","anenst","apropos","apud","around","as","aside","astride","at","athwart","atop","barring","before","behind","below","beneath","beside","besides","between","beyond","but","by","circa","despite","down","during","except","for","forenenst","from","given","in","inside","into","lest","like","modulo","near","next","notwithstanding","of","off","on","onto","out","over","per","plus","pro","qua","sans","since","than","through"," thru","throughout","thruout","till","to","toward","towards","under","underneath","until","unto","up","upon","versus","vs.","v.","vs","v","via","vis-à-vis","with","within","without","according to","ahead of","apart from","as for","as of","as per","as regards","aside from","back to","because of","close to","due to","except for","far from","inside of","instead of","near to","next to","on to","out from","out of","outside of","prior to","pursuant to","rather than","regardless of","such as","that of","up to","where as","or", "yet", "so", "for", "and", "nor", "a", "an", "the", "de", "d'", "von", "van", "c", "et", "ca"],

    _locale_dates: null

}; Translator.TitleCaser.Output = {}

// For citeproc-node

Translator.TitleCaser.TERMINAL_PUNCTUATION_REGEXP = new RegExp("^([" + Translator.TitleCaser.TERMINAL_PUNCTUATION.slice(0, -1).join("") + "])(.*)");

//SNIP-START

// skip jslint check on this file, it doesn't get E4X

//if (!CSL.System.Xml.E4X) {
//    load("./src/xmle4x.js");
//}
//if (!CSL.System.Xml.DOM) {
//    load("./src/xmldom.js");
//}

// notation, but these are reserved words in JS, and raise an error
// in rhino.  Setting them in brace notation avoids the processing error.)

// jstlint OK

//SNIP-END
/*global CSL: true */

Translator.TitleCaser.Output.Formatters = new function () {
    this.passthrough = passthrough;
    this.lowercase = lowercase;
    this.uppercase = uppercase;
    this.sentence = sentence;
    this.title = title;
    this["capitalize-first"] = capitalizeFirst;
    this["capitalize-all"] = capitalizeAll;

    /**
     * INTERNAL
     */

    var _tagParams = {
        "<span class=\"nocase\">": "</span>",
        "<span class=\"nodecor\">": "</span>"
    }

    function _capitalise (word, force) {
        // Weird stuff is (.) transpiled with regexpu
        //   https://github.com/mathiasbynens/regexpu
        var m = word.match(/(^\s*)((?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))(.*)/);
        // Do not uppercase lone Greek letters
        // (No case transforms in Greek citations, but chars used in titles to science papers)
        if (m && !(m[2].match(/^[\u0370-\u03FF]$/) && !m[3])) {
            return m[1] + m[2].toUpperCase() + m[3];
        }
        return word;
    }

    function _doppelString(str) {
        var mx, lst, len, pos, m, buf1, buf2, idx, ret, myret;
        // Normalize markup
        str = str.replace(/(<span)\s+(class=\"no(?:case|decor)\")[^>]*(>)/g, "$1 $2$3");
        var m1match = str.match(/((?: \"| \'|\"|\'|[-\/.,;?!:]|\[|\]|\(|\)|<span class=\"no(?:case|decor)\">|<\/span>|<\/?(?:i|sc|b|sub|sup)>))/g);
        if (!m1match) {
            return {
                tags: [],
                strings: [str]
            };
        }
        var m1split = str.split(/(?: \"| \'|\"|\'|[-\/.,;?!:]|\[|\]|\(|\)|<span class=\"no(?:case|decor)\">|<\/span>|<\/?(?:i|sc|b|sub|sup)>)/g);
        
        return {
            tags: m1match,
            strings: m1split,
            origStrings: m1split.slice()
        }
    }

    function _undoppelString(obj) {
        var ret, len, pos;
        lst = [];
        var lst = obj.strings.slice(-1);
        for (var i=obj.tags.length-1; i>-1; i+=-1) {
            lst.push(obj.tags[i]);
            lst.push(obj.strings[i]);
        }
        lst.reverse();
        return lst.join("");
    }
    
    function _textcaseEngine(config, string) {
        config.doppel = _doppelString(string);
        if (!string) {
            return "";
        }
        var quoteParams = {
            " \"": {
                opener: " \'",
                closer: "\""
            },
            " \'": {
                opener: " \"",
                closer: "\'"
            }
        }
        function quoteFix (tag, positions) {
            var m = tag.match(/(^(?:\"|\')|(?: \"| \')$)/);
            if (m) {
                return pushQuoteState(m[1], positions);
            }
        }
        function pushQuoteState(tag, pos) {
            var isOpener = [" \"", " \'"].indexOf(tag) > -1 ? true : false;
            if (isOpener) {
                return tryOpen(tag, pos);
            } else {
                return tryClose(tag, pos);
            }
        }
        function tryOpen(tag, pos) {
            if (config.quoteState.length === 0 || tag === config.quoteState[config.quoteState.length - 1].opener) {
                config.quoteState.push({
                    opener: quoteParams[tag].opener,
                    closer: quoteParams[tag].closer,
                    pos: pos
                });
                return false;
            } else {
                var prevPos = config.quoteState[config.quoteState.length-1].pos;
                config.quoteState.pop()
                config.quoteState.push({
                    opener: quoteParams[tag].opener,
                    closer: quoteParams[tag].closer,
                    positions: pos
                });
                return prevPos;
            }
        }
        function tryClose(tag, pos) {
            if (config.quoteState.length > 0 && tag === config.quoteState[config.quoteState.length - 1].closer) {
                config.quoteState.pop()
            } else {
                return pos;
            }
        }
        
        // Run state machine
        if (config.doppel.strings.length && config.doppel.strings[0].trim()) {
            config.doppel.strings[0] = config.capitaliseWords(config.doppel.strings[0], 0)
        }

    	for (var i=0,ilen=config.doppel.tags.length;i<ilen;i++) {
            var tag = config.doppel.tags[i];
            var str = config.doppel.strings[i+1];

            if (config.tagState !== null) {
                // Evaluate tag state for current string
                if (_tagParams[tag]) {
                    config.tagState.push(_tagParams[tag]);
                } else if (config.tagState.length && tag === config.tagState[config.tagState.length - 1]) {
                    config.tagState.pop();
                }
            }

            if (config.afterPunct !== null) {
                // Evaluate punctuation state of current string
                if (tag.match(/[\!\?\:]$/)) {
                    config.afterPunct = true;
                }
            }

            // Process if outside tag scope, else noop for upper-casing
            if (config.tagState.length === 0) {
                config.doppel.strings[i+1] = config.capitaliseWords(str, i+1);
            }
            
            if (config.quoteState !== null) {
                // Evaluate quote state of current string and fix chars that have flown
                var quotePos = quoteFix(tag, i);
                if (quotePos || quotePos === 0) {
                    var origChar = config.doppel.origStrings[quotePos+1].slice(0, 1);
                    config.doppel.strings[quotePos+1] = origChar + config.doppel.strings[quotePos+1].slice(1);
                    config.lastWordPos = null;
                }
            }

            // If there was a printable string, unset first-word and after-punctuation
            if (config.isFirst) {
                if (str.trim()) {
                    config.isFirst = false;
                }
            }
            if (config.afterPunct) {
                if (str.trim()) {
                    config.afterPunct = false;
                }
            }
        }
        // Capitalize the last word if necessary (bypasses stop-word list)
        if (config.lastWordPos) {
            var lastWords = config.doppel.strings[config.lastWordPos.strings].split(" ");
            var lastWord = _capitalise(lastWords[config.lastWordPos.words]);
            lastWords[config.lastWordPos.words] = lastWord;
            config.doppel.strings[config.lastWordPos.strings] = lastWords.join(" ");
        }
        // Recombine the string
        return _undoppelString(config.doppel);
    }

    /**
     * PUBLIC
     */

    /**
     * A noop that just delivers the string.
     */
    function passthrough (state, str) {
        return str;
    }

    /**
     * Force all letters in the string to lowercase, skipping nocase spans
     */
    function lowercase(state, string) {
        var config = {
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        words[i] = word.toLowerCase();
                    }
                }
                return words.join(" ");
            },
            tagState: [],
            isFirst: null
        }
        return _textcaseEngine(config, string);
    }

    /**
     * Force all letters in the string to uppercase.
     */
    function uppercase(state, string) {
        var config = {
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        words[i] = word.toUpperCase();
                    }
                }
                return words.join(" ");
            },
            tagState: [],
            isFirst: null
        }
        return _textcaseEngine(config, string);
    }

    /**
     * Similar to <b>capitalize_first</b>, but force the
     * subsequent characters to lowercase.
     */
    function sentence(state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        if (config.isFirst) {
                            words[i] = _capitalise(word);
                            config.isFirst = false;
                        } else {
                            words[i] = word.toLowerCase();
                        }
                    }
                }
                return words.join(" ");
            },
            tagState: [],
            isFirst: true
        }
        return _textcaseEngine(config, string);
    }

    function title(state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str, i) {
                if (str.trim()) {
                    var words = str.split(" ");
                    for (var j=0,jlen=words.length;j<jlen;j++) {
                        var word = words[j];
                        if (!word) continue;
                        if (word.length > 1 && !word.toLowerCase().match(config.skipWordsRex)) {
                            // Capitalize every word that is not a stop-word
                            words[j] = _capitalise(words[j]);
                        } else if (config.isFirst) {
                            // Capitalize first word, even if a stop-word
                            words[j] = _capitalise(words[j]);
                        } else if (config.afterPunct) {
                            // Capitalize after punctuation
                            words[j] = _capitalise(words[j]);
                        }
                        config.afterPunct = false;
                        config.isFirst = false;
                        config.lastWordPos = {
                            strings: i,
                            words: j
                        }
                    }
                    str = words.join(" ");
                }
                return str;
            },
            skipWordsRex: state.locale[state.opt.lang].opts["skip-words-regexp"],
            tagState: [],
            afterPunct: false,
            isFirst: true
        }
        return _textcaseEngine(config, string);
    }
    
    /**
     * Force capitalization of the first letter in the string, leave
     * the rest of the characters untouched.
     */
    function capitalizeFirst(state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        if (config.isFirst) {
                            words[i] = _capitalise(word);
                            config.isFirst = false;
                            break;
                        }
                    }
                }
                return words.join(" ");
            },
            tagState: [],
            isFirst: true
        }
        return _textcaseEngine(config, string);
    }

    /**
     * Force the first letter of each space-delimited
     * word in the string to uppercase, and leave the remainder
     * of the string untouched.  Single characters are forced
     * to uppercase.
     */
    function capitalizeAll (state, string) {
        var config = {
            quoteState: [],
            capitaliseWords: function(str) {
                var words = str.split(" ");
                for (var i=0,ilen=words.length;i<ilen;i++) {
                    var word = words[i];
                    if (word) {
                        words[i] = _capitalise(word);
                    }
                }
                return words.join(" ");
            },
            tagState: [],
            isFirst: null
        }
        return _textcaseEngine(config, string);
    }
}

// Generated by CoffeeScript 1.12.0
Translator.TitleCaser.state = {
  opt: {
    lang: 'en'
  },
  locale: {
    en: {
      opts: {}
    }
  }
};

Translator.TitleCaser.titleCase = function(text) {
  var opts;
  opts = Translator.TitleCaser.state.locale[Translator.TitleCaser.state.opt.lang].opts;
  if (!opts['skip-words']) {
    opts['skip-words'] = Translator.TitleCaser.SKIP_WORDS;
    opts['skip-words-regexp'] = new RegExp('(?:(?:[?!:]*\\s+|-|^)(?:' + opts['skip-words'].map(function(term) {
      return term.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]\s*/g, '\\$&');
    }).join('|') + ')(?=[!?:]*\\s+|-|$))', 'g');
  }
  return Translator.TitleCaser.Output.Formatters.title(Translator.TitleCaser.state, text);
};
