#include <iostream>
#include <vector>
#include <algorithm>
#include <climits>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> ls(n);
    for (int i = 0; i < n; i++) cin >> ls[i];
    int dummy; cin >> dummy;
    vector<int> ld(n);
    for (int i = 0; i < n; i++) cin >> ld[i];
    int m; cin >> m;
    vector<int> ws(m);
    for (int i = 0; i < m; i++) cin >> ws[i];
    cin >> dummy;
    vector<int> wd(m);
    for (int i = 0; i < m; i++) cin >> wd[i];
    int ans = INT_MAX;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            // Land first, then water
            int lend = ls[i] + ld[i];
            int wstart = max(ws[j], lend);
            int wend = wstart + wd[j];
            ans = min(ans, wend);
            // Water first, then land
            int wend2 = ws[j] + wd[j];
            int lstart = max(ls[i], wend2);
            int lend2 = lstart + ld[i];
            ans = min(ans, lend2);
        }
    }
    cout << ans << "\n";
    return 0;
}
