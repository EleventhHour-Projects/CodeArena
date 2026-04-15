#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> target(n);
    for (int i = 0; i < n; i++) cin >> target[i];
    long long ops = target[0];
    for (int i = 1; i < n; i++)
        if (target[i] > target[i-1])
            ops += target[i] - target[i-1];
    cout << ops << "\n";
    return 0;
}
