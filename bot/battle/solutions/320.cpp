#include <iostream>
#include <vector>
#include <unordered_map>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> gs(n);
    for (int i = 0; i < n; i++) cin >> gs[i];
    unordered_map<int, vector<int>> buckets;
    vector<vector<int>> result;
    for (int i = 0; i < n; i++) {
        buckets[gs[i]].push_back(i);
        if ((int)buckets[gs[i]].size() == gs[i]) {
            result.push_back(buckets[gs[i]]);
            buckets[gs[i]].clear();
        }
    }
    sort(result.begin(), result.end(), [](const vector<int>& a, const vector<int>& b) {
        return a.size() < b.size();
    });
    for (auto& grp : result) {
        for (int j = 0; j < (int)grp.size(); j++) {
            if (j) cout << ' ';
            cout << grp[j];
        }
        cout << "\n";
    }
    return 0;
}
