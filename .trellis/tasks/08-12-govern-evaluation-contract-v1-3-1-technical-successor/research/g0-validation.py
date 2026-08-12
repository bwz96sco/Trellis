#!/usr/bin/env python3
"""Validate A133-bound G0/T0 governance and planning deterministically."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[4]
TASKS = REPO / '.trellis' / 'tasks'
CANONICAL = '07-29-migrate-research-methodology-to-procedures'
PARENT = '08-12-implement-evaluation-contract-v1-3-1-technical-successor'
CHILDREN = ['08-12-govern-evaluation-contract-v1-3-1-technical-successor', '08-12-conform-core-runtime-to-evaluation-contract-v1-3-1', '08-12-conform-cli-to-evaluation-contract-v1-3-1', '08-12-project-procedure-2-0-7-family-packages', '08-12-build-v1-3-1-production-harness', '08-12-integrate-install-and-freeze-v1-3-1-subject', '08-12-assure-v1-3-1-complete-system-mal1', '08-12-decide-v1-3-1-technical-subject']
T0 = '08-12-govern-evaluation-contract-v1-3-1-technical-successor'
BASE = '2253df9fb67f8ee84d470da23205e9610f8a4e3e'
BASE_TREE = '7e5430197841776a6d8d7f31e8b82517473f082f'
A133 = '5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3'
A133_TREE = '47633d69ffb68b7e225e01e502fe133616a1078b'
B133 = '56277b874217a3b8a01b63a4905cf6b22708cb05'
B133_TREE = '3873721fe9208644e856f857a2c34e9651c96edc'
O133 = '2253df9fb67f8ee84d470da23205e9610f8a4e3e'
O133_TREE = '7e5430197841776a6d8d7f31e8b82517473f082f'
PLANNING = {'task.json','prd.md','design.md','implement.md','implement.jsonl','check.jsonl'}
GOV = ['g0-accepted-semantic-input-attestation.json', 'g0-semantic-campaign-reconciliation.json', 'g0-technical-baseline.json', 'g0-procedure-version-inventory.json', 'g0-protected-path-baseline.json', 'g0-topology-ownership-and-stage-inventories.json', 'g0-authority-role-and-stop-routing.json', 'g0-validation.py', 'g0-validation-evidence.json']
CANONICAL_OVERLAYS = ['.trellis/tasks/07-29-migrate-research-methodology-to-procedures/task.json', '.trellis/tasks/07-29-migrate-research-methodology-to-procedures/prd.md', '.trellis/tasks/07-29-migrate-research-methodology-to-procedures/design.md', '.trellis/tasks/07-29-migrate-research-methodology-to-procedures/implement.md', '.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/path-ownership-map.md']
INHERITED = {'AGENTS.md','CLAUDE.md','docs-site','marketplace','.trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research/cs5-8-honest-stop-record.json'}

class DuplicateKey(ValueError): pass

def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in items:
        if key in out: raise DuplicateKey(key)
        out[key] = value
    return out

def bad_constant(value: str) -> None: raise ValueError('non-finite number: ' + value)

def parse_bytes(data: bytes) -> Any:
    text = data.decode('utf-8', errors='strict')
    value = json.loads(text, object_pairs_hook=pairs, parse_constant=bad_constant)
    def walk(item: Any) -> None:
        if isinstance(item, float) and not math.isfinite(item): raise ValueError('non-finite number')
        if isinstance(item, dict):
            for k, v in item.items():
                if any(0xD800 <= ord(c) <= 0xDFFF for c in k): raise ValueError('surrogate key')
                walk(v)
        elif isinstance(item, list):
            for v in item: walk(v)
        elif isinstance(item, str) and any(0xD800 <= ord(c) <= 0xDFFF for c in item): raise ValueError('surrogate string')
    walk(value)
    return value

def load(path: Path) -> Any: return parse_bytes(path.read_bytes())
def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()
def run(args: list[str], cwd: Path = REPO, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, check=check, capture_output=True, text=True, encoding='utf-8', errors='replace')
def git(args: list[str], cwd: Path = REPO, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(['git','-c','i18n.logOutputEncoding=UTF-8',*args], cwd, check)
def object_record(commit: str, path: str) -> dict[str, Any]:
    spec = f'{commit}:{path}'
    data = subprocess.run(['git','-C',str(REPO),'show',spec], check=True, capture_output=True).stdout
    return {'blobOid':git(['rev-parse',spec]).stdout.strip(),'byteLength':len(data),'mode':'100644','objectType':'blob','path':path,'sha256':sha(data)}
def diff_digest(path: str) -> str: return sha(git(['diff','--binary','--',path]).stdout.encode())
def sub_diff(path: str) -> str: return sha(git(['diff','--binary'], cwd=REPO/path).stdout.encode())

def check_manifest(path: Path) -> None:
    rows = [line for line in path.read_bytes().splitlines() if line.strip()]
    assert len(rows) >= 3
    seen: set[str] = set()
    for raw in rows:
        row = parse_bytes(raw)
        assert set(row) == {'file','reason'} and len(row['reason'].strip()) >= 20
        assert row['file'] not in seen and (REPO/row['file']).is_file()
        seen.add(row['file'])

def allowed(path: str, g0: set[str]) -> bool: return path in g0 or path in INHERITED

def validate() -> dict[str, Any]:
    assertions: list[str] = []
    assert git(['rev-parse','HEAD']).stdout.strip() == BASE
    assert git(['rev-parse','HEAD^{tree}']).stdout.strip() == BASE_TREE
    for commit, tree in [(A133,A133_TREE),(B133,B133_TREE),(O133,O133_TREE)]:
        assert git(['rev-parse',commit+'^{commit}']).stdout.strip() == commit
        assert git(['rev-parse',commit+'^{tree}']).stdout.strip() == tree
    assertions.append('git-objects-and-technical-baseline-exact')

    top = load(TASKS/T0/'research/g0-topology-ownership-and-stage-inventories.json')
    g0 = set(top['g0Inventory']['paths'])
    assert len(g0) == top['g0Inventory']['count'] == 68
    parent = load(TASKS/PARENT/'task.json')
    assert parent['parent'] == CANONICAL and parent['children'] == CHILDREN and parent['status'] == 'in_progress'
    for i, child in enumerate(CHILDREN):
        task = load(TASKS/child/'task.json')
        assert task['parent'] == PARENT and task['children'] == []
        assert task['status'] == ('in_progress' if i == 0 else 'planning')
        assert task['assignee'] == ('claude' if i == 0 else None)
        assert task['meta']['active'] is (i == 0)
        assert task['meta']['taskExecutionAuthorized'] is (i == 0)
        for name in PLANNING: assert (TASKS/child/name).is_file()
    for name in PLANNING: assert (TASKS/PARENT/name).is_file()
    assertions.append('reciprocal-eight-child-topology-and-authority-exact')

    canonical = load(TASKS/CANONICAL/'task.json')
    assert canonical['status'] == 'in_progress' and canonical['children'].count(PARENT) == 1
    head_canonical = parse_bytes(subprocess.run(['git','-C',str(REPO),'show',f'HEAD:.trellis/tasks/{CANONICAL}/task.json'],check=True,capture_output=True).stdout)
    expected = dict(head_canonical); expected['children'] = [*head_canonical['children'], PARENT]
    assert canonical == expected
    assertions.append('canonical-parent-minimum-reciprocal-pointer-only')

    for name in [PARENT,*CHILDREN]:
        for doc in ['prd.md','design.md','implement.md']:
            text = (TASKS/name/doc).read_text(encoding='utf-8', errors='strict')
            assert text.startswith('# ') and len(text.strip()) >= 300 and 'TODO' not in text
        check_manifest(TASKS/name/'implement.jsonl'); check_manifest(TASKS/name/'check.jsonl')
        task = load(TASKS/name/'task.json')
        assert task['base_branch'] == 'evidence/v13-baseline'
        data = (TASKS/name/'task.json').read_bytes()
        assert data == (json.dumps(task,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)+'\n').encode()
        for manifest in ['implement.jsonl','check.jsonl']:
            raw = (TASKS/name/manifest).read_bytes()
            assert raw.endswith(b'\n') and not raw.endswith(b'\n\n')
            for line in raw.splitlines():
                value = parse_bytes(line)
                assert line == json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
    assert load(TASKS/T0/'task.json')['meta']['ownedInventoryKeys'] == ['G0']
    assertions.append('planning-packages-complete-curated-and-canonical')

    accepted = load(TASKS/T0/'research/g0-accepted-semantic-input-attestation.json')
    assert accepted['semanticCandidate']['commit'] == A133 and accepted['semanticCandidate']['tree'] == A133_TREE
    assert accepted['semanticCandidate']['candidateManifestSha256'] == 'e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a'
    assert accepted['semanticCandidate']['sevenMemberAggregate'] == 'sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34'
    assert accepted['semanticCandidate']['semanticDigest'] == 'sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af'
    assert accepted['semanticCandidate']['completeOutputSetDigest'] == 'sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642'
    assert len(accepted['semanticCandidate']['members']) == 7
    for rec in accepted['semanticCandidate']['members'] + accepted['semanticCandidate']['supportingArtifacts']:
        assert rec == object_record(A133, rec['path'])
    assert accepted['machineAssurance']['verdictArtifact'] == object_record(B133, accepted['machineAssurance']['verdictArtifact']['path'])
    assert accepted['operatorAcceptance']['artifact'] == object_record(O133, accepted['operatorAcceptance']['artifact']['path'])
    assertions.append('accepted-semantic-identities-path-blob-length-sha256-exact')

    recon = load(TASKS/T0/'research/g0-semantic-campaign-reconciliation.json')
    assert [x['classification'] for x in recon['classifications']] == ['superseded','rejected-terminal','accepted-terminal']
    for item in recon['classifications']:
        rec = item['terminalArtifact']; commit = item.get('terminalCommit', item.get('lastCommittedCommit'))
        assert rec == object_record(commit, rec['path']) and item['historicalTaskMetadataRewritten'] is False
    assertions.append('semantic-campaigns-reconciled-additively')

    proc = load(TASKS/T0/'research/g0-procedure-version-inventory.json')
    output = git(['log','--all','--format=','--name-only','--','packages/cli/src/templates/research/procedures']).stdout
    paths = sorted(set(line for line in output.splitlines() if line.strip()))
    versions = sorted(set(parts[-2] for p in paths if len(parts := p.split('/')) >= 2 and parts[-2].count('.') == 2))
    assert versions == proc['historyObservedVersions']
    assert not any('/2.0.7/' in p for p in paths) and proc['allocatedVersion'] == '2.0.7' and proc['candidateVersionCollision'] is False
    for inv in proc['baselineInventories']:
        rows = [line for line in git(['ls-tree','-r',BASE,'packages/cli/src/templates/research/procedures']).stdout.splitlines() if f"/{inv['version']}/" in line]
        payload = ('\n'.join(rows)+'\n').encode()
        families = sorted({line.split('\t',1)[1].split('/')[6] for line in rows})
        assert len(rows) == inv['blobCount'] and sha(payload) == inv['lsTreeRowsSha256']
        assert families == inv['families'] and len(families) == inv['familyCount']
    assert proc['repositoryFamilyCount'] == 17
    assertions.append('procedure-version-history-and-baseline-inventories-exact')

    seen: dict[str,str] = {}
    for key, inv in top['stageInventories'].items():
        assert len(inv['paths']) == inv['count'] == len(set(inv['paths']))
        for path in inv['paths']:
            assert path not in seen, f'ownership overlap {path} {seen.get(path)} {key}'
            seen[path] = key
            assert path != 'packages/core/src/research/stage-capabilities.ts'
    assertions.append('future-stage-inventories-exact-disjoint-and-live-selection-excluded')

    protected = load(TASKS/T0/'research/g0-protected-path-baseline.json')
    for rec in protected['files']:
        assert sha((REPO/rec['path']).read_bytes()) == rec['sha256'] and diff_digest(rec['path']) == rec['gitDiffBinarySha256']
    for rec in protected['submodules']:
        assert git(['rev-parse','HEAD'],cwd=REPO/rec['path']).stdout.strip() == rec['commit']
        assert git(['status','--short','--untracked-files=all'],cwd=REPO/rec['path']).stdout.splitlines() == rec['statusShort']
        assert sub_diff(rec['path']) == rec['gitDiffBinarySha256']
    u = protected['untrackedCs5Decision']; assert sha((REPO/u['path']).read_bytes()) == u['sha256']
    assertions.append('inherited-dirty-and-protected-baseline-unchanged')

    for path in [TASKS/T0/'research'/name for name in GOV if name.endswith('.json') and name != 'g0-validation-evidence.json']:
        data = path.read_bytes(); assert data.endswith(b'\n') and not data.endswith(b'\n\n')
        value = parse_bytes(data); assert data == (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)+'\n').encode()
    assertions.append('governance-json-canonical-strict-and-single-lf')

    rows = [r for r in git(['status','--porcelain=v1','-z','--untracked-files=all']).stdout.split('\0') if r]
    for row in rows:
        assert row[0] in {' ','?'}, 'staged path forbidden: '+row
        path = row[3:]
        assert allowed(path,g0), 'unexpected dirty path: '+path
    assert not git(['diff','--cached','--name-only']).stdout.strip()
    assertions.append('exact-g0-plus-inherited-dirty-scope-and-empty-index')

    markers = {'prd.md':'Additive current outcome — A133 technical successor','design.md':'Additive design — A133 technical successor','implement.md':'Additive execution — A133 technical successor','research/path-ownership-map.md':'Additive ownership — A133 technical successor'}
    for rel, marker in markers.items():
        current = (TASKS/CANONICAL/rel).read_text(encoding='utf-8',errors='strict')
        head = git(['show',f'HEAD:.trellis/tasks/{CANONICAL}/{rel}']).stdout
        assert current.startswith(head) and current[len(head):].startswith('\n## ')
        assert current[len(head):].count(marker) == 1 and marker not in head
    assertions.append('canonical-parent-prose-overlays-append-only')

    return {'assertionCount':len(assertions),'assertions':assertions,'g0PathCount':len(g0),'procedureVersion':'2.0.7','verdict':'pass'}

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument('--write',action='store_true'); parser.add_argument('--verify',action='store_true'); args = parser.parse_args()
    if args.write == args.verify: raise ValueError('choose exactly one of --write or --verify')
    result = validate(); payload = (json.dumps(result,sort_keys=True,separators=(',',':'))+'\n').encode()
    out = TASKS/T0/'research/g0-validation-evidence.json'
    if args.write: out.write_bytes(payload)
    else: assert out.read_bytes() == payload, 'validation evidence drift'
    sys.stdout.buffer.write(payload); return 0
if __name__ == '__main__':
    try: raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({'error':str(exc),'verdict':'fail'},sort_keys=True,separators=(',',':')),file=sys.stderr); raise
