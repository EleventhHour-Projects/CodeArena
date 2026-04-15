#include <iostream>
#include <vector>
#include <stack>
#include <unordered_map>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n1;
    if (!(cin >> n1)) return 0;
    vector<int> nums1(n1);
    for (int i = 0; i < n1; i++) cin >> nums1[i];
    int n2;
    cin >> n2;
    vector<int> nums2(n2);
    for (int i = 0; i < n2; i++) cin >> nums2[i];
    unordered_map<int, int> nextGreater;
    stack<int> st;
    for (int i = 0; i < n2; i++) {
        while (!st.empty() && st.top() < nums2[i]) {
            nextGreater[st.top()] = nums2[i];
            st.pop();
        }
        st.push(nums2[i]);
    }
    for (int i = 0; i < n1; i++) {
        if (i > 0) cout << " ";
        if (nextGreater.count(nums1[i])) cout << nextGreater[nums1[i]];
        else cout << -1;
    }
    cout << "\n";
    return 0;
}
