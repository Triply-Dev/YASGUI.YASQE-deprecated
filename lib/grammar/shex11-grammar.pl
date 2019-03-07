
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
shexDoC  ==> [*(directive),?([or(notStartAction,startActions),*(statement)]), $ ].


%[2] OK
directive ==> [or(baseDecl,prefixDecl,importDecl)].

%[3] OK
baseDecl ==> ['BASE','IRI_REF'].

%[4] OK
prefixDecl ==> ['PREFIX','PNAME_NS','IRI_REF'].

%[4.5] OK
importDecl ==> ['IMPORT','IRI_REF'].

%[5] OK
notStartAction ==> [or(startt,shapeExprDecl)].

%[6] OK
startt ==> ['start','=',inlineShapeExpression].

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
shapeDefinition ==>[*(or(extraPropertySet,'CLOSED')),'{',?(tripleExpression),'}',*(annotation),semanticActions].

%[34] OK
inlineShapeDefinition ==> [*(or(extraPropertySet,'CLOSED')),'{',?(tripleExpression),'}'].

%[35] OK
extraPropertySet ==> ['EXTRA',+(predicate)].

%[36] OK
tripleExpression ==> [oneOfTripleExpr].

%[37] OK
%oneOfTripleExpr ==> [or(groupTripleExpr,multiElementOneOf)]. MISSING THIS CORRECT RULE
oneOfTripleExpr ==> [groupTripleExpr].


%[38] OK
multiElementOneOf ==> [groupTripleExpr,+(['|',groupTripleExpr])].


%[40] NOW THIS RULE ONLY CALL THE elementGroup RULE
groupTripleExpr ==> [elementGroup].

%[41] THIS RULE HAS BEEN REPLACED BY RULE 42
%singleElementGroup ==> [unaryTripleExpr,';'].

%[42] THIS RULE NOW REPRESENTS THE RULE 41 (singleElementGroup) TOGETHER WITH RULE 42(multiELementGroup) to make it LL1
elementGroup ==> [unaryTripleExpr,';',*([unaryTripleExpr,';'])]. 

%[43] OK
unaryTripleExpr ==> [?(['$',tripleExprLabel]),or(tripleConstraint,bracketedTripleExpr)].
unaryTripleExpr ==> [include].



%[44] OK
bracketedTripleExpr ==> ['(',tripleExpression,')',

                        ?(cardinality),*(annotation),
                        semanticActions].

%[45]  OK
tripleConstraint ==> [?(senseFlags),predicate,
                    inlineShapeExpression,
                    ?(cardinality),*(annotation),
                    semanticActions].

%[46] OK
cardinality ==> ['*'].
cardinality ==> ['+'].
cardinality ==> ['?'].
cardinality ==> ['REPEAT_RANGE'].

%[47] OK
senseFlags ==> ['^'].

%[48] OK
valueSet ==> ['[',*(valueSetValue),']'].

%[49] OK
valueSetValue ==> [iriRange].
valueSetValue ==> [literalRange].
valueSetValue ==> [languageRange].
%valueSetValue ==> [+(exclusion)]. MISSING THIS CORRECT RULE

%[50] OK
exclusion ==> ['-',or(iri,literal,'LANGTAG'),?('~')].

%[51] OK
iriRange ==> [iri,?(['~',*(exclusion)])].

%[52] OK
iriExclusion ==> ['-',iri,?('~')].

%[53] OK
literalRange ==> [literal,?(['~',*(literalExclusion)])].

%[54] OK
%literalExclusion ==> ['-',literal,?('~')]. MISSING THIS CORRECT RULE
literalExclusion ==> ['.'].

%[55] OK
languageRange ==> ['LANGTAG',?(['~',*(languageExclusion)])].
languageRange ==> ['@','~',*(languageExclusion)].

%[56] OK
%languageExclusion ==> ['-','LANGTAG',?('~')]. MISSING THIS CORRECT RULE
languageExclusion ==> ['.'].


%[57] OK
include ==> ['&',tripleExprLabel].

%[58] OK
annotation ==>['//',predicate,or(iri,literal)].

%[59] OK
semanticActions ==> [*(codeDecl)].

%[60] OK
codeDecl ==> ['%',iri,or('CODE','%')].

%[13t] OK
literal ==> [or(rdfLiteral,numericLiteral,booleanLiteral)].

%[61] OK
predicate ==> [or(iri,'RDF_TYPE')].

%[62] OK
datatype ==> [iri].

%[63] OK
shapeExprLabel ==> [or(iri,blankNode)].

%[64] OK
tripleExprLabel ==> [or(iri,blankNode)].

%[16t] OK
numericLiteral ==>['INTEGER'].
numericLiteral ==>['DECIMAL'].
numericLiteral ==>['DOUBLE'].

%[65] OK
rdfLiteral ==> [or(langString,[string,?(['^^',datatype])])].


%[134s] OK
booleanLiteral ==> [or('true', 'false')].

%[135s] OK
string ==> ['STRING_LITERAL1'].
string ==> ['STRING_LITERAL_LONG1'].
string ==> ['STRING_LITERAL2'].
string ==> ['STRING_LITERAL_LONG2'].

%[66] OK
langString ==> ['LANG_STRING_LITERAL1'].
langString ==> ['LANG_STRING_LITERAL_LONG1'].
langString ==> ['LANG_STRING_LITERAL2'].
langString ==> ['LANG_STRING_LITERAL_LONG2'].

%[136s] OK
iri ==> [or('IRI_REF',prefixedName)].

%[137s] OK
prefixedName ==> [ or('PNAME_LN', 'PNAME_NS') ].

%[138]
blankNode ==> ['BLANK_NODE_LABEL'].




% tokens defined by regular expressions elsewhere
tm_regex([

'CODE',
'REPEAT_RANGE',
'RDF_TYPE',
'IRI_REF',
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
'
',
'true',
'false'

]).

% Terminals where name of terminal is uppercased token content
tm_keywords([

'BASE',
'PREFIX',
'IMPORT',
'start',
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
'//'='\\/\\/',
'%'='%',
'^^'= '\\^\\^'

]).
