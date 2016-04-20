---
title: From Unicode to LaTeX and Back Again
redirect_from:
- "/zotero-better-bibtex/Unicode-and-Markup.html"
- "/zotero-better-bibtex/unicode.html"
- "/zotero-better-bibtex/Going-hardcore.html"
- "/zotero-better-bibtex/hardcore.html"
---
# From Unicode to LaTeX and Back Again

Zotero does all its work in UTF-8 Unicode, which is absolutely the right thing to do. Unfortunately, for those shackled
to BibTeX and who cannot (yet) move to BibLaTeX, unicode is a major PITA. Also, Zotero supports some simple HTML markup
in your references that Bib(La)TeX won't understand; BBT will

* convert from/to HTML/LaTeX; Currently supports &lt;i&gt;&#8660;\emph &amp; \textit, &lt;b&gt;&#8660;\textbf,
  &lt;sub&gt;&#8660;\_{...},
  &lt;sup&gt;&#8660;^{...} and &lt;sc&gt;&#8660;\\textsc{...}; more can
  be added on request.
* The plugin contains a comprehensive list of LaTeX constructs, so stuff like \\"{o} or \\"o will be converted to their unicode equivalents on import.
* `csquotes` support by hidden preference; if you open `about:config` and set
  `extensions.zotero.translators.better-bibtex.csquotes` to a string of character pairs, each pair will be assumed to be
  the open and close parts of a pair and will be replaced with a `\\enquote{...}` construct.
* In English titles, you can control capitalization by surrounding parts of the text in `<span
  class="nocase">...</span>`. Text between these will not have their capitalization changed in any way.
* In names, you can force first names like `Philippe` to be exported to `{\relax Ph}ilippe` by adding a [end of guarded
  area](http://www.fileformat.info/info/unicode/char/0097/index.htm) character between `Ph` and `ilippe`
If you'd really just rather hand-code your LaTeX constructs, BBT makes that possible:

## Mapping Fields

There isn't a straightforward one-to-one mapping for all Zotero to Bib(La)TeX fields. For most I can make reasonable
choices, but there are some things where Better BibTeX takes a little more liberties with your references in order to
get sensible output.

### Title fields

Title fields are a total mess. Zotero [recommends having your titles in sentence
case](https://zotero-manual.github.io/zotero-manual/adding-items#sentence-and-title-case) because that's what the
embedded citation processor expects, but of course, BibLaTeX expects your titles to be in Title Case... *but only if
they're in English*. Nice.

Except sometimes, you want words that have capitals to keep. Capital Preservation does this. If you have capitals in a
word (except the first, because BibLaTeX wants access to that...), BBT assumes you meant it to be there, and you want
BibTeX to leave it alone no matter what. To do that, it wraps those (strings of) words in those double braces. This is
to let BibTeX know that `ISDN` may not be changed to `isdn` or `Isdn`.

The simplest approach would be to wrap title fields in extra braces as a whole. But some styles do need to recapitalize the
title, and having the whole field so wrapped interferes with that. So Better BibTeX wraps individual words -- or strings
of those words -- that have capitals in them with double braces. Yup, not one, but two. Because for reasons unknown,
`\emph{Homo sapiens}` will not be recapitalized, but -- get this now -- `{\emph{Homo sapiens}}` *will*. So to get
predictable behavior, this is written out as `{{\emph{Homo sapiens}}}`.

For English titles (and if no language is set, it is assumed to be -- I know, how very un-post-colonial of BibLaTeX),
BBT will Title Case your titles on output. Except, those Title Cased words which BBT changed itself will *not* be wrapped in double-braces,
as it *is* OK for the styles to change casing for those, depending on the style at play. So `I like ISDN heaps better
than dialup` would output to `I Like {{ISDN}} Heaps Better than Dialup`. Apparently non-English titles are supposed to
be in sentence case, so BBT doesn't touch those.

Bib(La)TeX be crazy.

## You are a hardcore LaTeX user!

* You can add literal LaTeX anywhere in your reference by surrounding it with &lt;pre&gt;....&lt;/pre&gt; tags. BBT will
  convert to/from unicode and (un)escape where required but will pass whatever is enclosed in the pre tags unchanged.
* An entry tagged with "#LaTeX" (case-sensitive!) will have all fields exported as-is, so you can include
  LaTeX markup in your references. If you enable "Raw BibTeX import" in the preferences, BibTeX imports will not be
  escaped on import, and will automatically be tagged for raw export.


<script type = 'text/javascript'>
          window.setTimeout(function(){ window.location.href = 'https://github.com/retorquere/zotero-better-bibtex/wiki/From-Unicode-to-LaTeX-and-Back-Again'; },3000)
        </script>