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
        if (arr[i] % 2 == 0) freq[arr[i]]++;
    }
    for (int i = 0; i < n; i++) {
        if (arr[i] % 2 == 0 && freq[arr[i]] == 1) {
            cout << arr[i] << "\n";
            return 0;
        }
    }
    cout << -1 << "\n";
    return 0;
}
