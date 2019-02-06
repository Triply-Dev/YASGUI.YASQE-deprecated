
/*

SPARQL 1.1 grammar rules based on the Last Call Working Draft of 24/07/2012:
  http://www.w3.org/TR/2012/WD-sparql11-query-20120724/#sparqlGrammar

Be careful with grammar notation - it is EBNF in prolog syntax!

[...] lists always represent sequence.
or can be used as binary operator or n-ary prefix term - do not put [...]
inside unless you want sequence as a single disjunct.

*, +, ? - generally used as 1-ary terms

stephen.cresswell@tso.co.uk
*/

% We need to be careful with end-of-input marker $
% Since we never actually receive this from Codemirror,
% we can't have it appear on RHS of deployed rules.
% However, we do need it to check whether rules *could* precede
% end-of-input, so use it with top-level

:-dynamic '==>'/2.

shexDoC ==> []

%[2]
directive ==> [or(baseDecl,prefixDecl,importDecl)].

%[3]
baseDecl ==> ['BASE','IRI_REF'].

%[4]
prefixDecl ==> ['PREFIX','PNAME_NS','IRIREF'].

%[4.5]
importDecl ==> ['IMPORT','IRIREF'].

%[5]
notStartAction ==> [or(start,shapeExprDecl)].

%[8]
statement ==> [or(directive,notStartAction)].

%[10]
shapeExpression ==> [shapeOr].

%[11]
inlineShapeExpression ==> [inlineShapeOr].

%[21]
shapeOrRef ==> [or(shapeDefinition,shapeRef)].

%[22]
inlineShapeOrRef ==> [or(inlineShapeDefinition,shapeRef)].

%[26]
nonLiteralKind ==> ['IRI'].
nonLiteralKind ==> ['BNODE'].
nonLiteralKind ==> ['NONLITERAL'].

%[27]
xsFacet ==> [or(stringFacet,numericFacet)].

%[29]
stringLength ==> ['LENGTH'].
stringLength ==> ['MINLENGTH'].
stringLength ==> ['MAXLENGTH'].

%[30]
numericRange ==> ['MININCLUSIVE'].
numericRange ==> ['MINEXCLUSIVE'].
numericRange ==> ['MAXINCLUSIVE'].
numericRange ==> ['MAXEXCLUSIVE'].

%[31]
numericLength ==> ['TOTALDIGITS'].
numericLength ==> ['FRACTIONDIGITS'].

%[36]
tripleExpression ==> [oneOfTripleExpr].

%[37]
oneOfTripleExpr ==> [or(groupTripleExpr,multiElementOneOf)].

%[40]
groupTripleExpr ==> [or(singleElementGroup,multiElementGroup)].


% tokens defined by regular expressions elsewhere
tm_regex([

'CODE',
'REPEAT_RANGE',
'RDF_TYPE',
'IRIREF',
'PNAME_NS',
'PNAME_LN',
'ATPNAME_NS',
'ATPNAME_LN',
'REGEXP',
'BLANK_NODE_LABEL',
'LANGTAG',
'INTEGER',
'DECIMAL',
'DOUBLE',
'EXPONENT',
'STRING_LITERAL1',
'STRING_LITERAL2',
'STRING_LITERAL_LONG1',
'STRING_LITERAL_LONG2',
'LANG_STRING_LITERAL1',
'LANG_STRING_LITERAL2',
'LANG_STRING_LITERAL_LONG1',
'LANG_STRING_LITERAL_LONG2',
'UCHAR',
'ECHAR',
'PN_CHARS_BASE',
'PN_CHARS_U',
'PN_CHARS',
'PN_PREFIX',
'PN_LOCAL',
'PLX',
'PERCENT',
'HEX',
'PN_LOCAL_ESC'.
'start',
'true',
'false'

]).

% Terminals where name of terminal is uppercased token content
tm_keywords([
'BASE',
'PREFIX',
'IMPORT',
'EXTERNAL',
'OR',
'AND',
'NOT',
'LITERAL',
'NONLITERAL',
'IRI',
'BNODE',
'LENGTH',
'MINLENGTH',
'MAXLENGTH',
'MININCLUSIVE',
'MINEXCLUSIVE',
'MAXINCLUSIVE',
'MAXEXCLUSIVE',
'TOTALDIGITS',
'FRACTIONDIGITS',
'CLOSED',
'EXTRA'
]).

% Other tokens representing fixed, case sensitive, strings
% Care! order longer tokens first - e.g. IRI_REF, <=, <
% e.g. >=, >
% e.g. NIL, '('
% e.g. ANON, [
% e.g. DOUBLE, DECIMAL, INTEGER
% e.g. INTEGER_POSITIVE, PLUS
tm_punct([

'='= '=',
'('= '\\(',
')'= '\\)',
'.'= '\\.',
'@'= '@',
'{'= '\\{',
'}'= '\\}',
'|' = '\\|',
';'= ';',
'$'= '$',
'*'= '\\*',
'+'= '\\+',
'?' = '\\?',
'^'= '\\^'
'['= '\\[',
']'= '\\]',
'-'= '-',
'~'='\\~',
'&'='&',
'//'='//',
'%'='%',
'^^'= '\\^\\^'

]).
