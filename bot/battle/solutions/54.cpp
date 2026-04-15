#include <iostream>
#include <vector>
#include <algorithm>
#include <climits>

using namespace std;

typedef long long ll;
const ll NEG_INF = -1e18;

struct SparseTable {
    vector<vector<int>> mx, mn;
    vector<int> lg;
    void build(const vector<int>& a) {
        int n = a.size();
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        lg.assign(n + 1, 0);
        for (int i = 2; i <= n; i++) lg[i] = lg[i / 2] + 1;
        mx.assign(LOG, vector<int>(n));
        mn.assign(LOG, vector<int>(n));
        for (int i = 0; i < n; i++) mx[0][i] = mn[0][i] = a[i];
        for (int j = 1; j < LOG; j++)
            for (int i = 0; i + (1 << j) <= n; i++) {
                mx[j][i] = max(mx[j - 1][i], mx[j - 1][i + (1 << (j - 1))]);
                mn[j][i] = min(mn[j - 1][i], mn[j - 1][i + (1 << (j - 1))]);
            }
    }
    ll query(int l, int r) {
        int k = lg[r - l + 1];
        return (ll)max(mx[k][l], mx[k][r - (1 << k) + 1]) -
               (ll)min(mn[k][l], mn[k][r - (1 << k) + 1]);
    }
};

ll solveLinear(const vector<int>& a, int k) {
    int n = a.size();
    if (n == 0) return 0;
    SparseTable st;
    st.build(a);
    vector<ll> prev(n + 1, NEG_INF), cur(n + 1, NEG_INF);
    prev[0] = 0;
    ll best = NEG_INF;
    for (int j = 1; j <= k; j++) {
        fill(cur.begin(), cur.end(), NEG_INF);
        for (int i = j; i <= n; i++) {
            for (int l = j - 1; l < i; l++) {
                if (prev[l] == NEG_INF) continue;
                ll val = prev[l] + st.query(l, i - 1);
                cur[i] = max(cur[i], val);
            }
        }
        if (cur[n] != NEG_INF) {
            if (cur[n] < best && j > 1) break;
            best = max(best, cur[n]);
        }
        swap(prev, cur);
    }
    return best;
}

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int k;
    cin >> k;
    if (n == 0) { cout << 0 << "\n"; return 0; }
    if (n == 1) { cout << 0 << "\n"; return 0; }

    int gmax_idx = 0, gmin_idx = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > a[gmax_idx]) gmax_idx = i;
        if (a[i] < a[gmin_idx]) gmin_idx = i;
    }

    auto makeLinear = [&](int cut) -> vector<int> {
        vector<int> v(n);
        for (int i = 0; i < n; i++)
            v[i] = a[(cut + i) % n];
        return v;
    };

    // Try breaking the circle at strategic positions
    // Break after gmax_idx, after gmin_idx, after gmax_idx-1, after gmin_idx-1
    vector<int> cuts;
    auto addCut = [&](int c) {
        c = ((c % n) + n) % n;
        cuts.push_back(c);
    };
    addCut(gmax_idx + 1);
    addCut(gmin_idx + 1);
    addCut(gmax_idx);
    addCut(gmin_idx);

    // Also handle j=1 (no partition, whole circle as one subarray)
    ll globalRange = (ll)*max_element(a.begin(), a.end()) -
                     (ll)*min_element(a.begin(), a.end());
    ll ans = globalRange;

    for (int c : cuts) {
        vector<int> lin = makeLinear(c);
        ll res = solveLinear(lin, k);
        ans = max(ans, res);
    }

    cout << ans << "\n";
    return 0;
}
