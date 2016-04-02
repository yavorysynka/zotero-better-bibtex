---
title: Scripting examples
---
# Scripting examples

# You wanted customized...

You got customized. It doesn't yet have a GUI, but as this really is a bit on the technical side, I feel warranted to go
without for now.

If you go into `about:config` you will find a preference `extensions.zotero.translators.better-bibtex.postscript`, which
is empty by default. In this, preference, you can paste a javascript string which will be executed for each reference
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
if (this.item.arXiv) {
  this.add({ name: 'journaltitle', bibtex: '{}' });
  this.add({ name: 'pages', value: this.item.arXiv });
}
```

<script type = 'text/javascript'>
          window.setTimeout(function(){ window.location.href = 'https://github.com/retorquere/zotero-better-bibtex/wiki/Scripting-examples'; },3000)
        </script>