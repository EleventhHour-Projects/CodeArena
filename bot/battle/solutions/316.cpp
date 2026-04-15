#include <iostream>
#include <vector>
#include <cmath>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n, c;
    if (!(cin >> n >> c)) return 0;
    vector<int> gx(n), gy(n);
    for (int i = 0; i < n; i++) cin >> gx[i] >> gy[i];
    cin >> c;
    int tx, ty;
    cin >> tx >> ty;
    int myDist = abs(tx) + abs(ty);
    for (int i = 0; i < n; i++) {
        int ghostDist = abs(gx[i] - tx) + abs(gy[i] - ty);
        if (ghostDist <= myDist) {
            cout << "false\n";
            return 0;
        }
    }
    cout << "true\n";
    return 0;
}
