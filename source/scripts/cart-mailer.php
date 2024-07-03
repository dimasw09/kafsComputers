<?php
/*!
  jQuery XML Store / Shop - Shopping Cart
  Created by livelyworks - http://livelyworks.net
  Ver. 3.5.0 - 22 JUN 2023

  If you understand PHP & html you can format  order emails sent to customer & admin
*/

if(!$_POST) {
    exit("INVALID REQUEST");
}

$orderData = $_POST;
// Request/Data validations
if( // request validation key
    !isset($orderData['requestValidation']) or ($orderData['requestValidation'] != 'via-submit-order')
    // check if has form details
    or !isset($orderData['formDetails']) or empty($orderData['formDetails'])
    // check if has cart details
    or !isset($orderData['cartDetails']) or empty($orderData['cartDetails'])
    // check if has business details
    or !isset($orderData['businessDetails']) or empty($orderData['businessDetails'])
    // check if has products
    or !isset($orderData['cartDetails']['products']) or empty($orderData['cartDetails']['products'])
) {
    // it may invalid request
    exit("INVALID REQUEST");
}

$cartDetails = $orderData['cartDetails'];
$products    = $cartDetails['products'];
$businessDetails = $orderData['businessDetails'];
$formDetails = [];

foreach ($orderData['formDetails'] as $formItem) {
    $formDetails[cleanItem($formItem['name'])] = cleanItem($formItem['value']);
}

function cleanItem($itemToClean)
{
    return trim(strip_tags(stripslashes($itemToClean)));
}

$messageResult 				= array();
$businessEmail 			    = cleanItem($businessDetails['email']);
$fromEmail                  = isset($businessDetails['fromEmail']) ? cleanItem($businessDetails['fromEmail']) : $businessEmail;
$customerEmail 				= cleanItem($formDetails["sof_email"]);

// check for valid email address
if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
            'message' => "Invalid email address",
            'error' => true,
            'field' => "sof_email"
        ]);

    return false;
}

$cartLength 				= $cartDetails["cartLength"];
$currencyCode 				= $cartDetails["currencyCode"];
$currencySymbol             = $cartDetails["currencySymbol"];
$totalAmount                = $cartDetails["totalAmount"];
$shippingCharges            = $cartDetails["totalShippingCharges"];
$totalTaxes                 = $cartDetails["totalTaxes"];
$cartTotal                  = $cartDetails["cartTotal"];

$storeName                  = $businessDetails['storeName'] ?: '';

$adminEmailHeaders 			= "From: " . $fromEmail . "\r\n";
$adminEmailHeaders 			.= "Reply-To: ". $customerEmail . "\r\n";
//$adminEmailHeaders 			.= "CC: sample@website.com\r\n";
$adminEmailHeaders 			.= "MIME-Version: 1.0\r\n";
//$adminEmailHeaders 			.= "Content-Type: text/html; charset=ISO-8859-1\r\n";
$adminEmailHeaders 			.= "Content-Type: text/html; charset=UTF-8\r\n";

$customerEmailHeaders 		= "From: " . $fromEmail . "\r\n";
$customerEmailHeaders 		.= "Reply-To: ". $businessEmail . "\r\n";
$customerEmailHeaders 		.= "MIME-Version: 1.0\r\n";
$customerEmailHeaders 		.= "Content-Type: text/html; charset=UTF-8\r\n";

$orderId = uniqid();

// message
$startMessage 				= "<html><head>
  <title>Order Details - $orderId</title>
</head>
<body style=\"font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;\" >
  <p>";

$customerInformation = "";

if(!empty($formDetails["fname"])) {
    $customerInformation .= "<br/>First Name: ";
    $customerInformation .= $formDetails["fname"];
}

if(!empty($formDetails["lname"])) {
    $customerInformation .= "<br/>Last Name: ";
    $customerInformation .= $formDetails["lname"];
}


if(!empty($formDetails["sof_add"])) {
    $customerInformation .= "<br/>Address: ";
    $customerInformation .= $formDetails["sof_add"];
}

if(!empty($formDetails["sof_zip"])) {
    $customerInformation .= "<br/>Zip Code: ";
    $customerInformation .= $formDetails["sof_zip"];
}

if(!empty($formDetails["sof_city"])) {
    $customerInformation .= "<br/>City: ";
    $customerInformation .= $formDetails["sof_city"];
}

if(!empty($formDetails["sof_email"])) {
    $customerInformation .= "<br/>Email: ";
    $customerInformation .= $formDetails["sof_email"];
}

if(!empty($formDetails["sof_ph"])) {
    $customerInformation .= "<br/>Phone: ";
    $customerInformation .= $formDetails["sof_ph"];
}

if(!empty($formDetails["sof_country"])) {
    $customerInformation .= "<br/>Country: ";
    $customerInformation .= $formDetails["sof_country"];
}

if(!empty($formDetails["sof_message"])) {
    $customerInformation .= "<br/>Message: ";
    $customerInformation .= $formDetails["sof_message"];
}

$cartMessage = "<br/></p><strong>Order Details.</strong><br/><br/>
    <strong>Order ID: </strong><span>$orderId</span> <br/><br/>
  <table border='1' cellpadding='5' cellspacing='0'>
    <tr>
      <th>Thumbnail</th>
      <th>Description</th>
      <th>Unit Price</th>
      <th>Quantity</th>
      <th>Amount</th>
    </tr>";
//$totalAmount = 0;

foreach ($products as $product) {
    $cartMessage .= "<tr><td>";
    $cartMessage .= "<a href='".$product["itemLink"]."'><img style='max-width: 75px;max-height: 75px;' src='".$product["thumbLink"]."' alt='".$product["name"]."'></a>";
    $cartMessage .= "</td><td>";
    $cartMessage .= "<a href='".$product["itemLink"]."'>".$product["name"]. ' - ' . $product["id"] . '</a><br>';
    if(isset($product["options"]) and !empty($product["options"])) {
        foreach ($product["options"] as $productOption) {
            $cartMessage .= '<small><strong>'. $productOption['title'] .'</strong> '.$productOption['value'];

            if(isset($productOption['addonPrice'])) {
                $cartMessage .= ' (+ '. $currencySymbol. ' '.$productOption['addonPrice'].')';
            }

            $cartMessage .= '</small> <br>';

        }
    }

    $cartMessage .= "</td><td>";
    $cartMessage .= $currencySymbol . $product["amount"]. " " . $currencyCode;
    $cartMessage .= "</td><td>";
    $cartMessage .= $product["qty"];
    $cartMessage .= "</td><td>";
    $cartMessage .= $currencySymbol.$product["totalAmount"]. " " . $currencyCode;
    $cartMessage .= "</td></tr>";
}

$cartMessage .= "</table>";

$cartMessage .= "<br/><div style='font-weight: normal; font-size: 14px; line-height: 1.6; background: #ECF8FF; margin: 0 0 15px; padding: 15px;'>";

$cartMessage .= "Cart Total: " .$currencySymbol.$cartTotal. " " . $currencyCode . "<br/>";

if($totalTaxes) {
    $cartMessage .= "Taxes: " .$currencySymbol.$totalTaxes. " " . $currencyCode . "<br/>";
}

if($shippingCharges) {
    $cartMessage .= "Shipping Charges: " .$currencySymbol.$shippingCharges. " " . $currencyCode . "<br/>";
}

$cartMessage .= "Total Payable amount: <strong> " . $currencySymbol. ($totalAmount). " " . $currencyCode . "</strong></div style='font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-weight: normal; font-size: 14px; line-height: 1.6; background: #ECF8FF; margin: 0 0 15px; padding: 15px;'>";
$endMessage = "</body></html>";


// Remove the backslashes that normally appears when entering " or '
$businessEmail = stripslashes($businessEmail);
//$message = stripslashes($message);

$adminMessageSubject = "[ ".$storeName." ] New Order#".$orderId." received";
$adminMessageSubjectHtml = "Hi admin, <h3>New order has been placed</h3> <span style='color:#999999;'><strong>Date: </strong>" . date("l jS \of F Y h:i:s A") . " </span> <br><br> <strong>Customer Information: </strong><br>";

$customerMessageSubject = "[ ".$storeName." ] Your order#".$orderId." has been placed";
$customerMessageSubjectHtml = "Hi there, <h3>Your order has been Placed </h3> <span style='color:#999999;'><strong>Date: </strong>" . date("l jS \of F Y h:i:s A") . " </span> <br><br> <strong>Information you provided: </strong><br>";

$adminMessage = $startMessage . $adminMessageSubjectHtml . $customerInformation . $cartMessage . $endMessage;
$customerMessage = $startMessage . $customerMessageSubjectHtml . $customerInformation . $cartMessage . $endMessage;

/*
 Send order email to store admin
*/
$messageResult['adminMailSent'] = false;
$messageResult['error'] = false;
$messageResult['message'] = '';
if(isset($adminMessage) and isset($adminMessageSubject) and isset($customerEmail)) {
    $adminMessageStatus = mail($businessEmail, $adminMessageSubject, $adminMessage, $adminEmailHeaders);

    $messageResult['adminMailSent'] = $adminMessageStatus;
    if(!$adminMessageStatus) {
        $messageResult['error'] = true;
        $messageResult['message'] = "Something went wrong please try again later, if problem persist contact us. Thank you";
    }
}
/*
 Send order email to customer
*/
$messageResult['customerMailSent'] = false;
if(isset($customerMessage) and isset($customerMessageSubject) and isset($customerEmail) and $messageResult['adminMailSent']) {
    $customerMessageStatus = mail($customerEmail, $customerMessageSubject, $customerMessage, $customerEmailHeaders);

    $messageResult['customerMailSent'] = $customerMessageStatus;
}

echo json_encode($messageResult);
return false;
