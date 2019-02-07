module.exports = {table:
{
  "*directive" : {
     "BASE": ["directive","*directive"], 
     "PREFIX": ["directive","*directive"], 
     "IMPORT": ["directive","*directive"], 
     "?(or([notStartAction,startActions]),*statement)": []}, 
  "baseDecl" : {
     "BASE": ["BASE","IRI_REF"]}, 
  "directive" : {
     "BASE": ["or([baseDecl,prefixDecl,importDecl])"], 
     "PREFIX": ["or([baseDecl,prefixDecl,importDecl])"], 
     "IMPORT": ["or([baseDecl,prefixDecl,importDecl])"]}, 
  "importDecl" : {
     "IMPORT": ["IMPORT","IRIREF"]}, 
  "or([baseDecl,prefixDecl,importDecl])" : {
     "BASE": ["baseDecl"], 
     "PREFIX": ["prefixDecl"], 
     "IMPORT": ["importDecl"]}, 
  "prefixDecl" : {
     "PREFIX": ["PREFIX","PNAME_NS","IRIREF"]}, 
  "shexDoC" : {
     "?(or([notStartAction,startActions]),*statement)": ["*directive","?(or([notStartAction,startActions]),*statement)","$"], 
     "BASE": ["*directive","?(or([notStartAction,startActions]),*statement)","$"], 
     "PREFIX": ["*directive","?(or([notStartAction,startActions]),*statement)","$"], 
     "IMPORT": ["*directive","?(or([notStartAction,startActions]),*statement)","$"]}
},

keywords:/^(BASE|PREFIX|IMPORT|EXTERNAL|OR|AND|NOT|LITERAL|NONLITERAL|IRI|BNODE|LENGTH|MINLENGTH|MAXLENGTH|MININCLUSIVE|MINEXCLUSIVE|MAXINCLUSIVE|MAXEXCLUSIVE|TOTALDIGITS|FRACTIONDIGITS|CLOSED|EXTRA)/i ,

punct:/^(=|\(|\)|\.|@|\{|\}|\||;|$|\*|\+|\?|\^|\[|\]|-|\~|&|//|%|\^\^)/ ,

startSymbol:"shexDoC",
acceptEmpty:true,
}