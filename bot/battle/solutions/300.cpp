#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int target;
    cin >> target;
    int first = -1, last = -1;
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] >= target) hi = mid - 1;
        else lo = mid + 1;
    }
    if (lo < n && arr[lo] == target) first = lo;
    lo = 0; hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] <= target) lo = mid + 1;
        else hi = mid - 1;
    }
    if (hi >= 0 && arr[hi] == target) last = hi;
    if (first == -1 || last == -1) cout << "-1 -1" << "\n";
    else cout << first << " " << last << "\n";
    return 0;
}
