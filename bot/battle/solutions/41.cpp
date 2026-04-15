#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> fruits(n);
    for (int i = 0; i < n; i++) cin >> fruits[i];
    int nb;
    cin >> nb;
    vector<int> baskets(nb);
    for (int i = 0; i < nb; i++) cin >> baskets[i];
    vector<bool> used(nb, false);
    int unplaced = 0;
    for (int i = 0; i < n; i++) {
        bool placed = false;
        for (int j = 0; j < nb; j++) {
            if (!used[j] && baskets[j] >= fruits[i]) {
                used[j] = true;
                placed = true;
                break;
            }
        }
        if (!placed) unplaced++;
    }
    cout << unplaced << "\n";
    return 0;
}
