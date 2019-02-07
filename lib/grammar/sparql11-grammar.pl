
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

%[1]
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

%[6]
start ==> ['start','=',inlineShapeExpression].

%[7]
startActions ==> [+(codeDecl)].

%[8]
statement ==> [or(directive,notStartAction)].

%[9]
shapeExprDecl ==> [shapeExpressionLabel,or(shapeExpression,'EXTERNAL')].

%[10]
shapeExpression ==> [shapeOr].

%[11]
inlineShapeExpression ==> [inlineShapeOr].

%[12]
shapeOr ==> [shapeAnd,*('OR',shapeAnd)].

%[13]
inlineShapeOr ==> [inlineShapeAnd,*('OR',inlineShapeAnd)].

%[14]
shapeAnd ==> [shapeNot,*('AND',shapeNot)].

%[15]
inlineShapeAnd ==> [inlineShapeNot,*('AND',inlineShapeNot)].

%[16]
shapeNot ==> [?('NOT'),shapeAtom].

%[17]
inlineShapeNot ==> [?('NOT'),inlineShapeAtom].

%[18]
shapeAtom ==> [nonliteralConstraint,?(shapeOrRef)].
shapeAtom ==> [litNodeConstraint].
shapeAtom ==> [shapeOrRef,?(nonliteralConstraint)].
shapeAtom ==> ['(',shapeExpression,')'].
shapeAtom ==> ['.'].

%[19]
shapeAtomNoRef ==> [nonLiteNodeConstraint,?(shareOrRef)].
shapeAtomNoRef ==> [liteNodeConstraint].
shapeAtomNoRef ==> [shareOrRef,?(nonLiteNodeConstraint)].
shapeAtomNoRef ==> ['(',shapeExpression,')'].
shapeAtomNoRef ==> ['.'].

%[20]
inlineShapeAtom ==> [nonLiteNodeConstraint,?(inlineShareOrRef)].
inlineShapeAtom ==> [liteNodeConstraint].
inlineShapeAtom ==> [inlineShareOrRef,?(nonLiteNodeConstraint)].
inlineShapeAtom ==> ['(',shapeExpression,')'].
inlineShapeAtom ==> ['.'].

%[21]
shapeOrRef ==> [or(shapeDefinition,shapeRef)].

%[22]
inlineShapeOrRef ==> [or(inlineShapeDefinition,shapeRef)].

%[23]
shapeRef ==> ['ATPNAME_LN'].
shapeRef ==> ['ATPNAME_NS'].
shapeRef ==> ['@',shapeExprLabel].

%[24]
litNodeConstraint ==> ['LITERAL',*(xsFacet)].
litNodeConstraint ==> [datatype,*(xsFacet)].
litNodeConstraint ==> [valueSet,*(xsFacet)].
litNodeConstraint ==> [+(numericFacet)].

%[25]
nonLitNodeConstraint ==> [nonLiteralKind,*(stringFacet)].
nonLitNodeConstraint ==> [+(stringFacet)].

%[26]
nonLiteralKind ==> ['IRI'].
nonLiteralKind ==> ['BNODE'].
nonLiteralKind ==> ['NONLITERAL'].

%[27]
xsFacet ==> [or(stringFacet,numericFacet)].

%[28]
stringFacet ==> [stringLength,'INTEGER'].
stringFacet ==> ['REGEXP'].

%[29]
stringLength ==> ['LENGTH'].
stringLength ==> ['MINLENGTH'].
stringLength ==> ['MAXLENGTH'].

%[30]
numericFacet ==> [numericRange,numericLiteral].
numericFacet ==> [numericLength,'INTEGER'].

%[31]
numericRange ==> ['MININCLUSIVE'].
numericRange ==> ['MINEXCLUSIVE'].
numericRange ==> ['MAXINCLUSIVE'].
numericRange ==> ['MAXEXCLUSIVE'].

%[32]
numericLength ==> ['TOTALDIGITS'].
numericLength ==> ['FRACTIONDIGITS'].

%[33]
shapeDefinition ==>
      [*(or(extraPropertySet,'CLOSED')),
      '{',?(tripleExpression),'}'
      ,*(anotation),semanticActions]

%[34]
inlineShapeDefinition ==>
      [*(or(extraPropertySet,'CLOSED')),
      '{',?(tripleExpression),'}']

%[35]
extraPropertySet ==> ['EXTRA',+(predicate)]

%[36]
tripleExpression ==> [oneOfTripleExpr].

%[37]
oneOfTripleExpr ==> [or(groupTripleExpr,multiElementOneOf)].

%[38]
multiElementOneOf ==> [groupTripleExpr,+('|',groupTripleExpr).

%[40]
groupTripleExpr ==> [or(singleElementGroup,multiElementGroup)].

%[41]
singleElementGroup ==> [unaryTripleExpr,?(';')].

%[42]
multiElementGroup ==> [unaryTripleExpr,+(';',unaryTripleExpr),?(';')].

%[43]
unaryTripleExpr ==> [?('$',tripleExprLabel),or(tripleConstraint,bracketedTripleExpr)].
unaryTripleExpr ==> [include].

%[44]
bracketedTripleExpr ==> ['(',tripleExpression,')',
                        ?(cardinality),*(anotation),
                        semanticActions].

%[45]
tripleConstraint ==> [?(senseFlags),predicate,
                    inlineShapeExpression,
                    ?(cardinality),*(anotation),
                    semanticActions].

%[46]
cardinality ==> ['*'].
cardinality ==> ['+'].
cardinality ==> ['?'].
cardinality ==> ['REPEAT_RANGE'].

%[47]
senseFlags ==> ['^'].

%[48]
valueSet ==> ['[',*(valueSetValue),']'].

%[49]
valueSetValue ==> [iriRange].
valueSetValue ==> [literalRange].
valueSetValue ==> [languajeRange].
valueSetValue ==> [+(exclusion)].

%[50]
exclusion ==> ['-',or(iri,literal,'LANGTAG'),?('~')].

%[51]
iriRange ==> [iri,?('~',*(exclusion))].

%[52]
iriExclusion ==> ['-',iri,?('~')].

%[53]
literalRange ==> [literal,?('~',*(literalExclusion))].

%[54]
literalExclusion ==> ['-',literal,?('~')].

%[55]
languageRange ==> ['LANGTAG',?('~',*(languageExclusion))].
languageRange ==> ['@','~',*(languageExclusion)].

%[56]
languageExclusion ==> ['-','LANGTAG',?(~)].

%[57]
include ==> ['&',tripleExprLabel].

%[58]
anotation ==>['//',predicate,or(iri,literal)].

%[59]
semanticActions ==> [*(codeDecl)].

%[60]
codeDecl ==> ['%',iri,or('CODE','%')].

%[13t]
literal ==> [or(rdfLiteral,numericLiteral,booleanLiteral)].

%[61]
predicate ==> [or(iri,'RDF_TYPE')].

%[62]
datatype ==> [iri].

%[63]
shapeExprLabel ==> [or(iri,blankNode)].

%[64]
tripleExprLabel ==> [or(iri,blankNode)].

%[16t]
numericLiteral ==>['INTEGER'].
numericLiteral ==>['DECIMAL'].
numericLiteral ==>['DOUBLE'].

%[134s]
booleanLiteral ==> [or('true', 'false')].

%[135s]
string ==> ['STRING_LITERAL1'].
string ==> ['STRING_LITERAL_LONG1'].
string ==> ['STRING_LITERAL2'].
string ==> ['STRING_LITERAL_LONG2'].

%[66]
langString ==> ['LANG_STRING_LITERAL1'].
langString ==> ['LANG_STRING_LITERAL_LONG1'].
langString ==> ['LANG_STRING_LITERAL2'].
langString ==> ['LANG_STRING_LITERAL_LONG2'].

%[136s]
iri ==> [or('IRIREF',prefixedName)].

%[137s]
prefixedName ==> [ or('PNAME_LN', 'PNAME_NS') ].

%[138s]
blankNode ==> ['BLANK_NODE_LABEL'].


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
