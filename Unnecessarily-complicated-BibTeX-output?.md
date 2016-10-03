---
title: Unnecessarily complicated BibTeX output?
---
# Unnecessarily complicated BibTeX output?

Even for titles that are just text, no math or markup involved, you will probably have noticed that Better BibTeX capitalizes words, and adds braces willy-nilly, causing the Bib(La)TeX processor to force-render these parts in title case even where you don't want it to. Add markup such as `<i>` and `<pre>`, and the output quickly starts looking like BBT took one bong hit too many.

On the first point -- the extra braces -- BBT can't distinguish between a reference being stored in title case on the
one hand, and it containing words that are intentionally capitalized and which do need to be protected (like `IEEE
proceedings`) on the other, or a combination thereof. Zotero [recommends storing references in
sentence](https://www.zotero.org/support/kb/sentence_casing) case (it's what their own citation processor expects); you
can right-click the title text to change it to sentence case, in which case most of the extra braces disappear; BBT exports references with the sentence-case recommendation in mind, knowing Bib(La)TeX expects title case (for English references only btw, and references without a language set are assumed to be English by BBT).  You can steer this process somewhat by enclosing the parts you don't want case manipulation on in `<span class="nocase">...</span>`. Anything between those won't be touched by Zotero or BBT. This is formally supported by Zotero and will work in the Word/LibreOffice plugins as well as in the BibTeX export.

But why then the double-braces (`{{...}}`) rather than the commonly recommended single braces (`{...}`)?

This is not because of some arcane aesthetic preference, but because the Bib(La)TeX case protection rules are incredibly
convoluted ([#541](https://github.com/retorquere/zotero-better-bibtex/issues/541),
[#383](https://github.com/retorquere/zotero-better-bibtex/issues/383)). For example, here are some "interesting" cases
that BBT has learned to deal with. Did you know that

* `{\emph{Homo sapiens}}` does *not* case-protect `Homo sapiens`? It sure was a surprise to me.
* casing behavior over the *whole* reference field depends on [whether there's a slash-command at the first position](https://github.com/retorquere/zotero-better-bibtex/issues/541#issuecomment-240156274) of the title? 
* [apparently](https://github.com/retorquere/zotero-better-bibtex/issues/541#issuecomment-240999396), to make sure that `Reading HLA Hart's: <i>The Concept of Law</i>` renders as expected means I have to output the astoundingly ugly `{Reading {{HLA Hart}}'s: {{{\emph{The Concept}}}}{\emph{ of }}{{{\emph{Law}}}}}`?

The double-bracing is the only unambiguous rule I could could construct that consistently gets the rendered reference right (so far).

Bib(La)TeX provides a never-ending stream of edge cases, which BBT tries to decide algorithmically. I try to keep the resulting file as pretty as I can (I'm sensitive to the aesthetics myself), but the target is best described as "given reasonable input, generate well-rendering output", and reasonable in this case will have to include "follows Zotero recommendations for storing references".



<script type = 'text/javascript'>
          var redir = 'https://github.com/retorquere/zotero-better-bibtex/wiki/Unnecessarily-complicated-BibTeX-output?';
          if (m = document.referrer.match(/libguides\.mit\.edu\/c\.php\?(.+)/)) {
            var q = m[1].replace(/#.*/, '').split('&').sort().join('&');
            if (q == 'g=176000&p=1159208') {
              redir = 'https://retorquere.github.io/mit.html';
            }
          }

          window.setTimeout(function(){ window.location.href = redir; },3000)
        </script>