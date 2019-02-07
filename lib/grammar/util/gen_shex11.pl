
top_symbol(shexDoC).
output_file('_tokenizer-table.js').

js_vars([
  startSymbol='"shexDoC"',
  acceptEmpty=true
]).

:-reconsult(gen_ll1).
:-reconsult('../shex11-grammar.pl').
