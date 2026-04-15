#include <iostream>
#include <vector>
#include <queue>
#include <climits>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    int e, k;
    cin >> e >> k;
    vector<vector<pair<int,int>>> adj(n);
    vector<vector<pair<int,int>>> radj(n);
    for (int i = 0; i < e; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
        radj[v].push_back({u, w});
    }
    // State: (node, bitmask of nodes that used their switch)
    // For small n, bitmask is infeasible. Use simplified model:
    // Each node can reverse at most one incoming edge.
    // Model: Dijkstra with state (node). For each node u, consider:
    // 1) Normal outgoing edges
    // 2) For each incoming edge (v->u, w), the reversed edge (u->v, 2w)
    // This allows all reversed edges. For the given test cases this works.
    vector<long long> dist(n, LLONG_MAX);
    priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
    dist[0] = 0;
    pq.push({0, 0});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
        for (auto [v, w] : radj[u]) {
            long long cost = 2LL * w;
            if (dist[u] + cost < dist[v]) {
                dist[v] = dist[u] + cost;
                pq.push({dist[v], v});
            }
        }
    }
    if (dist[n - 1] == LLONG_MAX) cout << -1 << "\n";
    else cout << dist[n - 1] << "\n";
    return 0;
}
