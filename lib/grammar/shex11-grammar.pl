
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

%[1] OK
shexDoC ==> [*(directive),?([or(notStartAction,startActions),*(statement)]), $ ].

%[2] OK
directive ==> [or(baseDecl,prefixDecl,importDecl)].

%[3] OK
baseDecl ==> ['BASE','IRIREF'].

%[4] OK
prefixDecl ==> ['PREFIX','PNAME_NS','IRIREF'].

%[4.5] OK
importDecl ==> ['IMPORT','IRIREF'].

%[5] OK
notStartAction ==> [or(start,shapeExprDecl)].

%[6] OK
start ==> ['start','=',inlineShapeExpression].

%[7] OK
startActions ==> [+(codeDecl)].

%[8] OK
statement ==> [or(directive,notStartAction)].

%[9] OK
shapeExprDecl ==> [shapeExprLabel,or(shapeExpression,'EXTERNAL')].

%[10] OK
shapeExpression ==> [shapeOr].

%[11] OK
inlineShapeExpression ==> [inlineShapeOr].

%[12] OK
shapeOr ==> [shapeAnd,*(['OR',shapeAnd])].

%[13] OK
inlineShapeOr ==> [inlineShapeAnd,*(['OR',inlineShapeAnd])].

%[14] OK
shapeAnd ==> [shapeNot,*(['AND',shapeNot])].

%[15] OK
inlineShapeAnd ==> [inlineShapeNot,*(['AND',inlineShapeNot])].

%[16] OK
shapeNot ==> [?('NOT'),shapeAtom].

%[17] OK
inlineShapeNot ==> [?('NOT'),inlineShapeAtom].

%[18] OK
shapeAtom ==> [nonLitNodeConstraint,?(shapeOrRef)].
shapeAtom ==> [litNodeConstraint].
shapeAtom ==> [shapeOrRef,?(nonLitNodeConstraint)].
shapeAtom ==> ['(',shapeExpression,')'].
shapeAtom ==> ['.'].

%[19] OK
shapeAtomNoRef ==> [nonLitNodeConstraint,?(shapeOrRef)].
shapeAtomNoRef ==> [litNodeConstraint].
shapeAtomNoRef ==> [shapeDefinition,?(nonLitNodeConstraint)].
shapeAtomNoRef ==> ['(',shapeExpression,')'].
shapeAtomNoRef ==> ['.'].

%[20] OK
inlineShapeAtom ==> [nonLitNodeConstraint,?(inlineShapeOrRef)].
inlineShapeAtom ==> [litNodeConstraint].
inlineShapeAtom ==> [inlineShapeOrRef,?(nonLitNodeConstraint)].
inlineShapeAtom ==> ['(',shapeExpression,')'].
inlineShapeAtom ==> ['.'].

%[21] OK
shapeOrRef ==> [or(shapeDefinition,shapeRef)].

%[22] OK
inlineShapeOrRef ==> [or(inlineShapeDefinition,shapeRef)].

%[23] OK
shapeRef ==> ['ATPNAME_LN'].
shapeRef ==> ['ATPNAME_NS'].
shapeRef ==> ['@',shapeExprLabel].

%[24] OK
litNodeConstraint ==> ['LITERAL',*(xsFacet)].
litNodeConstraint ==> [datatype,*(xsFacet)].
litNodeConstraint ==> [valueSet,*(xsFacet)].
litNodeConstraint ==> [+(numericFacet)].

%[25] OK
nonLitNodeConstraint ==> [nonLiteralKind,*(stringFacet)].
nonLitNodeConstraint ==> [+(stringFacet)].

%[26] OK
nonLiteralKind ==> ['IRI'].
nonLiteralKind ==> ['BNODE'].
nonLiteralKind ==> ['NONLITERAL'].

%[27] OK
xsFacet ==> [or(stringFacet,numericFacet)].

%[28] OK
stringFacet ==> [stringLength,'INTEGER'].
stringFacet ==> ['REGEXP'].

%[29] OK
stringLength ==> ['LENGTH'].
stringLength ==> ['MINLENGTH'].
stringLength ==> ['MAXLENGTH'].

%[30] OK
numericFacet ==> [numericRange,numericLiteral].
numericFacet ==> [numericLength,'INTEGER'].

%[31] OK
numericRange ==> ['MININCLUSIVE'].
numericRange ==> ['MINEXCLUSIVE'].
numericRange ==> ['MAXINCLUSIVE'].
numericRange ==> ['MAXEXCLUSIVE'].

%[32] OK
numericLength ==> ['TOTALDIGITS'].
numericLength ==> ['FRACTIONDIGITS'].

%[33] OK
shapeDefinition ==>[*(or(extraPropertySet,'CLOSED')),'{',?(tripleExpression),'}',*(anotation),semanticActions].

%[34] OK
inlineShapeDefinition ==> [*(or(extraPropertySet,'CLOSED')),'{',?(tripleExpression),'}'].

%[35] OK
extraPropertySet ==> ['EXTRA',+(predicate)].

%[36] OK
tripleExpression ==> [oneOfTripleExpr].

%[37] OK
oneOfTripleExpr ==> [groupTripleExpr].
oneOfTripleExpr ==> [multiElementOneOf].


%[38] OK
multiElementOneOf ==> [groupTripleExpr,multiElementOneOfSeparator)].

%[39]
multiElementOneOfSeparator ==> [+(['|',groupTripleExpr]].

%[40] OK
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
'PN_LOCAL_ESC',
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
'^'= '\\^',
'['= '\\[',
']'= '\\]',
'-'= '-',
'~'='\\~',
'&'='&',
'//'='//',
'%'='%',
'^^'= '\\^\\^'

]).
