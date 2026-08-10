# A133 author design
A task-local generator reads exact Git objects. It copies no stale attempt-specific values, preserves ten invariant outputs byte-for-byte, rebuilds the 19-key target using the accepted v1.3 wrapped/plain representations, recomputes dependent evidence and digests, and fails closed on any provenance source or semantic mismatch.
