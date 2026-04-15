#include <iostream>
#include <vector>

using namespace std;

int par[1001], rnk[1001];

int find(int x) {
    while (par[x] != x) x = par[x] = par[par[x]];
    return x;
}

bool unite(int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return false;
    if (rnk[a] < rnk[b]) swap(a, b);
    par[b] = a;
    if (rnk[a] == rnk[b]) rnk[a]++;
    return true;
}

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n, k;
    if (!(cin >> n >> k)) return 0;
    for (int i = 0; i <= n; i++) { par[i] = i; rnk[i] = 0; }
    int au = -1, av = -1;
    for (int i = 0; i < n; i++) {
        int u, v;
        cin >> u >> v;
        if (!unite(u, v)) { au = u; av = v; }
    }
    cout << au << " " << av << "\n";
    return 0;
}
