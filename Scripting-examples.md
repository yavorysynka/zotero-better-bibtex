---
title: Scripting examples
---
# Scripting examples

# You wanted customized...

You got customized. If you go into the Advanced tab of the Better BibTeX preferences you will find a text box (empty by default) where you can edit a javascript snippet which will be executed for each reference
generated in the Bib(La)TeX exporter. In this code, you have access to the reference just before it will be written out
and cached. You can have a look at the [Scripting API](Scripting-API) documentation(ish) for the API(ish), but usually you can just open a new issue and ask me to write it, and I'll add it here (it's how the examples got here).

## Add accessdate, url for BibTeX

Since BibTeX doesn't really have well-defined behavior across styles the way BibLaTeX does, BBT can't generate URL data which is compatible with all BibTeX styles. If you know the style you use yourself, you can add the data in the format you want using a postscript. The script below will add a note for the last accessed date, and a `\url` tag within the `howpublished` field, but only for BibTeX, not for BibLaTeX, and only for `webpage` entries:

```js
if (this.item.itemType === 'webpage' && Translator.BetterBibTeX) {
    if (this.item.accessDate) {
      this.add({ name: 'note', value: "(accessed " + this.item.accessDate + ")" });
    }
    if (this.item.url) {
      this.add({ name: 'howpublished', bibtex: "{\\url{" + this.enc_verbatim({value: this.item.url}) + "}}" });
    }
  }
```

## Comma's in keywords

If you want to retain commas in your keywords (e.g. for chemical elements) and separate with a comma-space, you could do:

```js
this.add({ name: 'keywords', replace: true, value: this.item.tags, sep: ', ' });
```

as the default encoder knows what to do with arrays, if you give it a separator.

## Add DOI in note field

```js
if (this.item.DOI) {
  var doi = this.item.DOI;
  if (doi.indexOf('doi:') != 0) { doi = 'doi:' + doi; }
  this.add({ name: 'note', duplicate: true, value: '[' + doi + ']' });
}
```

## Add arXiv data

arXiv is a bit of an odd duck. It really isn't a journal, so it shouldn't be the journal title, and their own recommendations on how to include arXiv IDs is a little lacking: [this](https://arxiv.org/help/faq/references) doesn't say where to include the `arXiv:...` identfier, and [this](http://arxiv.org/hypertex/bibstyles/) says *not* to include it. Nor does it give any recommendations on how to achieve the [desired output](https://arxiv.org/help/faq/references).

But for arguments' sake, let's say you get the desired output by including an empty `journaltitle` field (ugh) and stuff the `arXiv:...` ID in the `pages` field (*ugh*). You could do that with the following postscript:

```
if (this.item.arXiv.id) {
  this.add({ name: 'pages', value: this.item.arXiv.id });
  if (!this.has.journaltitle) { this.add({ name: 'journaltitle', bibtex: '{}' }); }
}
```

## Custom field order

Specify the ordering of the listing of fields in an exported Biblatex/Bibtex entry. Your postscript:

```javascript
// the bib(la)tex fields are ordered according to this array.
// If a field is not in this list, it will show up at the end in random order.
// https://github.com/retorquere/zotero-better-bibtex/issues/512
var order = ['author', 'date', 'origdate', 'shorthand', 'title'];
this.fields.sort(function(a, b) {
  var oa = order.indexOf(a.name);
  var ob = order.indexOf(b.name);
  if (oa < 0) { return 1; } // a is not in order, so put it at the end
  if (ob < 0) { return -1; } // b is not in order, so put it at the end
  return oa - ob;
});
```
In Zotero when using an Export Format of Better Biblatex we'll get something like the following entry ...

<pre><code>@book{nietzsche_1974_gay,
  <strong>author</strong> = {Nietzsche, Friedrich Wilhelm},
  <strong>date</strong> = {1974-03},
  <strong>origdate</strong> = {1882},
  <strong>shorthand</strong> = {GS},
  <strong>title</strong> = {The {{Gay Science}}: {{With}} a {{Prelude}} in {{Rhymes}} and an {{Appendix}} of {{Songs}}},
  keywords = {Philosophy / General,Philosophy / History  Surveys / Modern},
  translator = {Kaufmann, Walter},
  publisher = {{Random House}},
  timestamp = {2016-06-05T20:12:28Z},
  pagetotal = {407},
  shorttitle = {The {{Gay Science}}},
  isbn = {0-394-71985-9},
  edition = {1}
}
</code></pre>

Further details [Export to Biblatex/Bibtex. Custom field order. #512](https://github.com/retorquere/zotero-better-bibtex/issues/512).



<script type = 'text/javascript'>
          var redir = 'https://github.com/retorquere/zotero-better-bibtex/wiki/Scripting-examples';
          if (m = document.referrer.match(/libguides\.mit\.edu\/c\.php\?(.+)/)) {
            var q = m[1].replace(/#.*/, '').split('&').sort().join('&');
            if (q == 'g=176000&p=1159208') {
              redir = 'https://retorquere.github.io/mit.html';
            }
          }

          window.setTimeout(function(){ window.location.href = redir; },3000)
        </script>