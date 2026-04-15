#include <iostream>
#include <vector>
#include <algorithm>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> scores(n);
    for (int i = 0; i < n; i++) cin >> scores[i];
    vector<pair<int, int>> indexed(n);
    for (int i = 0; i < n; i++) indexed[i] = {scores[i], i};
    sort(indexed.begin(), indexed.end(), greater<pair<int,int>>());
    vector<string> result(n);
    for (int i = 0; i < n; i++) {
        int idx = indexed[i].second;
        if (i == 0) result[idx] = "Gold Medal";
        else if (i == 1) result[idx] = "Silver Medal";
        else if (i == 2) result[idx] = "Bronze Medal";
        else result[idx] = to_string(i + 1);
    }
    for (int i = 0; i < n; i++) {
        if (i > 0) cout << " ";
        cout << result[i];
    }
    cout << "\n";
    return 0;
}
