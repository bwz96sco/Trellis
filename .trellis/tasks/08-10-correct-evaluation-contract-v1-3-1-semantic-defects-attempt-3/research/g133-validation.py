from __future__ import annotations
import argparse, hashlib, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent
G133=[".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/task.json", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/prd.md", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/design.md", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/implement.md", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/implement.jsonl", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/check.jsonl", ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/task.json", ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/prd.md", ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/design.md", ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/implement.md", ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/implement.jsonl", ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/check.jsonl", ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/task.json", ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/prd.md", ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/design.md", ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/implement.md", ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/implement.jsonl", ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/check.jsonl", ".trellis/tasks/08-10-decide-evaluation-contract-v1-3-1-attempt-3/task.json", ".trellis/tasks/08-10-decide-evaluation-contract-v1-3-1-attempt-3/prd.md", ".trellis/tasks/08-10-decide-evaluation-contract-v1-3-1-attempt-3/design.md", ".trellis/tasks/08-10-decide-evaluation-contract-v1-3-1-attempt-3/implement.md", ".trellis/tasks/08-10-decide-evaluation-contract-v1-3-1-attempt-3/implement.jsonl", ".trellis/tasks/08-10-decide-evaluation-contract-v1-3-1-attempt-3/check.jsonl", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/task.json", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/prd.md", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/design.md", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/implement.md", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/path-ownership-map.md", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/research/g133-governance-baseline-attestation.json", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/research/g133-topology-and-path-ownership.json", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/research/g133-candidate-evidence-provenance-target-closure.json", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/research/g133-output-inventories.json", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/research/g133-authority-and-containment.json", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/research/g133-validation.py", ".trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/research/g133-validation-evidence.json"]
ROOTS=["08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3", "08-10-author-evaluation-contract-v1-3-1-attempt-3", "08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3", "08-10-decide-evaluation-contract-v1-3-1-attempt-3"]
PROTECTED=["AGENTS.md", "CLAUDE.md", "docs-site", "marketplace", ".trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research/cs5-8-honest-stop-record.json"]
EVIDENCE=BASE/'g133-validation-evidence.json'
def fail(msg): raise SystemExit(msg)
def pairs(items):
 d={}
 for k,v in items:
  if k in d: fail('duplicate decoded key: '+k)
  d[k]=v
 return d
def load(p):
 b=p.read_bytes()
 try: s=b.decode('utf-8','strict')
 except UnicodeDecodeError as e: fail(f'invalid utf8 {p}: {e}')
 if any(0xD800<=ord(c)<=0xDFFF for c in s): fail('unpaired surrogate: '+str(p))
 return json.loads(s,object_pairs_hook=pairs,parse_constant=lambda x:fail('non-finite: '+x))
def canonical(p):
 o=load(p); exp=(json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode()
 if p.read_bytes()!=exp: fail('noncanonical: '+str(p))
def run(*a): return subprocess.check_output(a,cwd=ROOT).decode('utf-8','strict')
def status():
 raw=subprocess.check_output(['git','status','--porcelain=v1','-z','--untracked-files=all'],cwd=ROOT).decode('utf-8','strict')
 out=[]
 for x in raw.split('\0'):
  if not x: continue
  out.append(x[3:])
 return sorted(out)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--write',action='store_true');a=ap.parse_args()
 inv=load(BASE/'g133-output-inventories.json')['inventories']
 if inv['G133']['paths']!=G133 or inv['G133']['count']!=36: fail('inventory mismatch')
 if len(G133)!=36 or len(set(G133))!=36: fail('not exact 36')
 for rel in G133:
  if rel.endswith('g133-validation-evidence.json') and a.write and not (ROOT/rel).exists(): continue
  if not (ROOT/rel).is_file(): fail('missing '+rel)
 for rel in G133:
  if rel.endswith('.json') and (ROOT/rel).exists() and '/research/g133-' in rel: canonical(ROOT/rel)
 for r in ROOTS:
  t=load(ROOT/'.trellis/tasks'/r/'task.json')
  if r==ROOTS[0]:
   if t['children']!=ROOTS[1:] or t['status']!='in_progress' or not t['meta']['active']: fail('parent topology/status')
  else:
   if t['parent']!=ROOTS[0] or t['status']!='planning' or t['assignee'] is not None or t['meta']['active']: fail('child topology/status')
  for k in ["taskExecutionAuthorized", "humanReviewed", "humanEquivalent", "repairAuthority", "runtimeImplementationAuthorized", "cliImplementationAuthorized", "procedurePackageAuthorized", "harnessImplementationAuthorized", "liveSelectionChangeAuthorized", "runtimeActivationAuthorized", "activationAuthorized", "archiveAuthorized", "releaseAuthorized", "publicationAuthorized", "pushAuthorized"]:
   if t['meta'].get(k) is not False: fail('task authority '+r+' '+k)
 canon_parent=load(ROOT/'.trellis/tasks/07-29-migrate-research-methodology-to-procedures/task.json')
 if canon_parent['children'].count(ROOTS[0])!=1: fail('canonical child pointer')
 for rel in ['prd.md','design.md','implement.md','research/path-ownership-map.md']:
  text=(ROOT/'.trellis/tasks/07-29-migrate-research-methodology-to-procedures'/rel).read_text(encoding='utf-8',errors='strict')
  if text.count('Attempt-3')+text.count('attempt-3')<1: fail('missing overlay '+rel)
 c=load(BASE/'g133-candidate-evidence-provenance-target-closure.json')
 if c['correctionClass']!='candidate-evidence/provenance-target-closure' or c['normativeSemanticCorrection'] is not False: fail('correction class')
 if len(c['target']['topLevelKeys'])!=19 or len(c['targetPointers'])!=14: fail('target closure cardinality')
 if len(c['outputPartition']['byteIdenticalToA132'])!=10 or len(c['outputPartition']['mustChangeFromA132'])!=5: fail('output partition')
 if c['frozenPopulations']['provenanceRows']!=3343 or c['frozenPopulations']['semanticDiffRows']!=9515 or c['frozenPopulations']['lifecycleDecisions']!=14365: fail('population drift')
 if run('git','diff','--cached','--name-only').strip(): fail('staged set not empty')
 effective=[x for x in G133 if not (a.write and x.endswith('g133-validation-evidence.json') and not (ROOT/x).exists())]
 expected=sorted(effective+PROTECTED)
 actual=status()
 if actual!=expected: fail('dirty set mismatch\nexpected='+json.dumps(expected)+'\nactual='+json.dumps(actual))
 b=load(BASE/'g133-governance-baseline-attestation.json')['protectedBaseline']
 for x in b['files']:
  data=(ROOT/x['path']).read_bytes()
  if len(data)!=x['byteLength'] or hashlib.sha256(data).hexdigest()!=x['sha256']: fail('protected file drift '+x['path'])
 x=b['untrackedCs5Decision'];data=(ROOT/x['path']).read_bytes()
 if len(data)!=x['byteLength'] or hashlib.sha256(data).hexdigest()!=x['sha256']: fail('cs5 drift')
 for x in b['submodules']:
  if run('git','-C',x['path'],'rev-parse','HEAD').strip()!=x['commit']: fail('submodule commit drift')
  got=run('git','-C',x['path'],'status','--short','--untracked-files=all').splitlines()
  if got!=x['statusShort']: fail('submodule status drift')
 for r in ROOTS:
  subprocess.check_call(['uv','run','python','./.trellis/scripts/task.py','validate',r],cwd=ROOT)
 subprocess.check_call(['git','diff','--check','--']+G133,cwd=ROOT)
 record={'recordKind':'g133-validation-evidence','schemaVersion':1,'result':'pass','checks':{'exactG133PathCount':36,'taskPackages':4,'canonicalParentOverlays':5,'governanceOutputs':7,'targetKeys':19,'targetPointers':14,'unchangedOutputs':10,'changedOutputs':5,'provenanceRows':3343,'semanticDiffRows':9515,'lifecycleDecisions':14365,'stagedPaths':0},'authority':{'taskExecutionAuthorized': False, 'humanReviewed': False, 'humanEquivalent': False, 'repairAuthority': False, 'runtimeImplementationAuthorized': False, 'cliImplementationAuthorized': False, 'procedurePackageAuthorized': False, 'harnessImplementationAuthorized': False, 'liveSelectionChangeAuthorized': False, 'runtimeActivationAuthorized': False, 'activationAuthorized': False, 'archiveAuthorized': False, 'releaseAuthorized': False, 'publicationAuthorized': False, 'pushAuthorized': False}}
 data=(json.dumps(record,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode()
 if a.write: EVIDENCE.write_bytes(data)
 elif not EVIDENCE.exists() or EVIDENCE.read_bytes()!=data: fail('validation evidence drift')
 print(json.dumps(record,sort_keys=True))
if __name__=='__main__': main()
