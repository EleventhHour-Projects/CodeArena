#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    unordered_map<int, int> freq;
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
        freq[arr[i]]++;
    }
    int ans = -1;
    for (auto& [val, cnt] : freq)
        if (val == cnt) ans = max(ans, val);
    cout << ans << "\n";
    return 0;
}
