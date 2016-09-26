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

    PROCESSOR_VERSION: "1.1.136",

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

    // TAG_ESCAPE: /(<span class=\"no(?:case|decor)\">.*?<\/span>)/,
    TAG_ESCAPE: function (str, stopWords) {
        var mx, lst, len, pos, m, buf1, buf2, idx, ret, myret;
        // A stopWords list is used when title-casing. See formatters.js
        if (!stopWords) {
            stopWords = [];
        }
        // Pairs
        var pairs = {
            "<span class=\"nocase\">": "</span>",
            "<span class=\"nodecor\">": "</span>"
        };
        var stack = [];
        // Normalize markup
        str = str.replace(/(<span)\s+(class=\"no(?:case|decor)\")\s*(>)/g, "$1 $2$3");
        // Split and match
        var m1match = str.match(/((?: \"| \'|\" |\'[-.,;\?:]|\[|\]|\(|\)|<span class=\"no(?:case|decor)\">|<\/span>|<\/?(?:i|sc|b|sub|sup)>))/g);
        if (!m1match) {
            return [str];
        }
        var m1split = str.split(/(?: \"| \'|\" |\'[-.,;\?:]|\[|\]|\(|\)|<span class=\"no(?:case|decor)\">|<\/span>|<\/?(?:i|sc|b|sub|sup)>)/g);
        
        // Adjust
        outer: for (var i=0,ilen=m1match.length; i<ilen; i++) {
            if (pairs[m1match[i]]) {
                stack.push({
                    tag: m1match[i],
                    pos: i
                });
                // If current string begins with a stop word,
                // and the previous string does not end with
                // punctuation, move the string to the tag split.
                var mFirstWord = m1split[i].match(/^(\s*([^' ]+[']?))(.*)/);
                if (mFirstWord) {
                    if (stopWords.indexOf(mFirstWord[2]) > -1) {
                        if (!m1split[i-1].match(/[:\?\!]\s*$/)) {
                            m1match[i-1] = m1match[i-1] + mFirstWord[1];
                            m1split[i] = mFirstWord[3];
                        }
                    }
                }
                continue;
            }
            if (stack.length) {
                // If current tag matches any tag on the stack,
                // drop mismatched tags and move strings for
                // the remainder, and pop the current tag.
                for (var j=stack.length-1; j>-1; j--) {
                    var stackObj = stack.slice(j)[0];
                    if (m1match[i] === pairs[stackObj.tag]) {
                        // Prune. We might be behind an apostrophe or something.
                        stack = stack.slice(0, j+1);
                        // Get the list position of the tag, and move strings to tags list between there and here.
                        var startPos = stack[j].pos;
                        for (var k=stack[j].pos+1; k<i+1; k++) {
                            m1match[k] = m1split[k] + m1match[k];
                            m1split[k] = "";
                        }
                        // Done with that one.
                        stack.pop();
                        break;
                    }
                }
            }
        }
        myret = [m1split[0]];
        for (pos = 1, len = m1split.length; pos < len; pos += 1) {
            myret.push(m1match[pos - 1]);
            myret.push(m1split[pos]);
        }
        var lst = myret.slice();
        return lst;
    },

    // TAG_USEALL: /(<[^>]+>)/,

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

/**
 * A bundle of handy functions for text processing.
 * <p>Several of these are ripped off from various
 * locations in the Zotero source code.</p>
 * @namespace Toolkit of string functions
 */
Translator.TitleCaser.Output.Formatters = {};

// See util_substitute.js and queue.js (append) for code supporting
// strip-periods.
//CSL.Output.Formatters.strip_periods = function (state, string) {
//    return string.replace(/\./g, "");
//};

/**
 * A noop that just delivers the string.
 */
Translator.TitleCaser.Output.Formatters.passthrough = function (state, string) {
    return string;
};

/**
 * Force all letters in the string to lowercase.
 */
;

/**
 * Force all letters in the string to uppercase.
 */
;

/**
 * Force capitalization of the first letter in the string, leave
 * the rest of the characters untouched.
 */
;

/**
 * Similar to <b>capitalize_first</b>, but force the
 * subsequent characters to lowercase.
 */
;

/**
 * Force the first letter of each space-delimited
 * word in the string to uppercase, and leave the remainder
 * of the string untouched.  Single characters are forced
 * to uppercase.
 */
;

/**
 * A complex function that attempts to produce a pattern
 * of capitalization appropriate for use in a title.
 * Will not touch words that have some capitalization
 * already.
 */
Translator.TitleCaser.Output.Formatters.title = function (state, string) {
    var str, words, isAllUpperCase, newString, lastWordIndex, previousWordIndex, upperCaseVariant, lowerCaseVariant, pos, skip, notfirst, notlast, aftercolon, len, idx, tmp, skipword, ppos, mx, lst, myret;
    var SKIP_WORDS = state.locale[state.opt.lang].opts["skip-words"];
    if (!string) {
        return "";
    }
    var doppel = Translator.TitleCaser.Output.Formatters.doppelString(string, Translator.TitleCaser.TAG_ESCAPE, SKIP_WORDS);
    function capitalise (word, force) {
        // Weird stuff is (.) transpiled with regexpu
        //   https://github.com/mathiasbynens/regexpu
        var m = word.match(/([:?!]+\s+|-|^)((?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))(.*)/);
        // Do not uppercase lone Greek letters
        // (This may not be a good thing when setting Greek-language citations)
        if (m && !(m[2].match(/^[\u0370-\u03FF]$/) && !m[3])) {
            return m[1] + m[2].toUpperCase() + m[3];
        }
        return word;
    }
    function splitme (str, rex) {
        var m = str.match(rex);
        if (m) {
            var splits = str.split(rex);
            res = [splits[0]];
            for (var i=0; i<m.length; i++) {
                res.push(m[i]);
                res.push(splits[i+1]);
            }
        } else {
            res = [str];
        }
        return res;
    }
    // Split on skip words
    var str = doppel.string;
    var lst = splitme(str, state.locale[state.opt.lang].opts["skip-words-regexp"]);
    
    // Capitalise stop-words that occur after a colon
    for (i=1,ilen=lst.length;i<ilen;i+=2) {
        if (lst[i].match(/^[:?!]/)) {
            lst[i] = capitalise(lst[i]);
        }
    }
    // Capitalise stop-words if they are the first or last words
    if (!lst[0] && lst[1]) {
        lst[1] = capitalise(lst[1]);
    }
    if (lst.length > 2 && !lst[lst.length-1]) {
        lst[lst.length-2] = capitalise(lst[lst.length-2]);
    }
    for (var i=0,ilen=lst.length;i<ilen;i+=2) {
        var words = lst[i].split(/([:?!]*\s+|\/|-)/);
        // Inspect each word individually
        for (var k=0,klen=words.length;k<klen;k+=2) {
            // Word has length
            if (words[k].length !== 0) {
                //print("Word: ("+words[k]+")");
                upperCaseVariant = words[k].toUpperCase();
                lowerCaseVariant = words[k].toLowerCase();
                // Always leave untouched if word contains a number
                if (words[k].match(/[0-9]/)) {
                    continue;
                }
                // Transform word only if all lowercase
                if (words[k] === lowerCaseVariant) {
                    //print("   do: "+capitalise(words[k]));
                    words[k] = capitalise(words[k]);
                }
            }
        }
        lst[i] = words.join("");
    }
    doppel.string = lst.join("");
    var ret = Translator.TitleCaser.Output.Formatters.undoppelString(doppel);
    return ret;
};

/*
* Based on a suggestion by Shoji Kajita.
*/
Translator.TitleCaser.Output.Formatters.doppelString = function (string, rex, stopWords) {
    var ret, pos, len;
    ret = {};
    // rex is a function that returns an appropriate array.
    //
    // XXXXX: Does this work in Internet Explorer?
    //
    ret.array = rex(string, stopWords);
    //print("ret.array: "+ret.array);
    // ret.array = string.split(rex);
    ret.string = "";
    for (var i=0,ilen=ret.array.length; i<ilen; i += 2) {
        if (ret.array[i-1] === "-" && false) {
            ret.string += " " + ret.array[i];
        } else {
            ret.string += ret.array[i];
        }
    }
    return ret;
};

Translator.TitleCaser.Output.Formatters.undoppelString = function (str) {
    var ret, len, pos;
    ret = "";
    for (var i=0,ilen=str.array.length; i<ilen; i+=1) {
        if ((i % 2)) {
            ret += str.array[i];
        } else {
            if (str.array[i-1] === "-" && false) {
                ret += str.string.slice(0, str.array[i].length+1).slice(1);
                str.string = str.string.slice(str.array[i].length+1);
            } else {
                ret += str.string.slice(0, str.array[i].length);
                str.string = str.string.slice(str.array[i].length);
            }
        }
    }
    return ret;
};

;

;


// Generated by CoffeeScript 1.10.0
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
    opts['skip-words'] = Translator.titleCaseLowerCase || Translator.TitleCaser.SKIP_WORDS;
    opts['skip-words-regexp'] = new RegExp('(?:(?:[?!:]*\\s+|-|^)(?:' + opts['skip-words'].map(function(term) {
      return term.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]\s*/g, '\\$&');
    }).join('|') + ')(?=[!?:]*\\s+|-|$))', 'g');
  }
  return Translator.TitleCaser.Output.Formatters.title(Translator.TitleCaser.state, text);
};
