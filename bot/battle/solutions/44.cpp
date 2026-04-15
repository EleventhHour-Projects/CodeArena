#include <iostream>
#include <vector>
#include <algorithm>
#include <set>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    set<int> s(arr.begin(), arr.end());
    int mn = *min_element(arr.begin(), arr.end());
    int mx = *max_element(arr.begin(), arr.end());
    vector<int> missing;
    for (int i = mn; i <= mx; i++) {
        if (s.find(i) == s.end()) missing.push_back(i);
    }
    if (missing.empty()) {
        cout << "-1\n";
    } else {
        for (int i = 0; i < (int)missing.size(); i++) {
            if (i > 0) cout << " ";
            cout << missing[i];
        }
        cout << "\n";
    }
    return 0;
}
